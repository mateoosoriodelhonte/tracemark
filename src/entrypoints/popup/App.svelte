<script lang="ts">
  import { onMount } from 'svelte';
  import { INBOX_COLLECTION_ID } from '../../domain/constants';
  import type { CaptureResult, Collection } from '../../domain/models';
  import { CaptureResultSchema, CollectionSchema } from '../../domain/schemas';
  import { sendRequest } from '../../messaging/client';
  import type { MessageRequest, MessageResponse } from '../../messaging/protocol';

  type Request = (message: MessageRequest) => Promise<MessageResponse>;
  interface Props {
    request?: Request;
  }

  let { request = sendRequest }: Props = $props();
  let draft = $state<CaptureResult>();
  let collections = $state<Collection[]>([]);
  let collectionId = $state(INBOX_COLLECTION_ID);
  let tagsText = $state('');
  let note = $state('');
  let phase = $state<'loading' | 'ready' | 'saving' | 'saved' | 'error'>('loading');
  let status = $state('Reading the current selection…');
  let error = $state('');
  const canSave = $derived(
    draft !== undefined &&
      collectionId.length > 0 &&
      phase !== 'loading' &&
      phase !== 'saving' &&
      phase !== 'saved',
  );

  onMount(() => {
    void loadDraft();
  });

  async function loadDraft(): Promise<void> {
    try {
      const [captureResponse, collectionsResponse] = await Promise.all([
        request({ type: 'capture.current' }),
        request({ type: 'collections.list' }),
      ]);
      if (!captureResponse.ok) {
        showError(captureResponse.message);
        return;
      }
      if (!collectionsResponse.ok) {
        showError(collectionsResponse.message);
        return;
      }

      const parsedCapture = CaptureResultSchema.safeParse(captureResponse.data);
      const parsedCollections = CollectionSchema.array().safeParse(collectionsResponse.data);
      if (!parsedCapture.success || !parsedCollections.success) {
        showError('TraceMark received invalid capture data.');
        return;
      }

      draft = parsedCapture.data;
      collections = parsedCollections.data;
      if (!collections.some((collection) => collection.id === collectionId)) {
        collectionId = collections[0]?.id ?? '';
      }
      phase = 'ready';
      status = 'Selection ready to save.';
    } catch {
      showError('TraceMark could not read this page.');
    }
  }

  async function save(): Promise<void> {
    if (!canSave || draft === undefined) return;
    phase = 'saving';
    error = '';
    status = 'Saving quotation…';

    try {
      const response = await request({
        type: 'highlights.create',
        input: {
          ...draft,
          collectionId,
          tags: tagsText
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
          note,
        },
      });
      if (!response.ok) {
        showError(response.message);
        return;
      }
      phase = 'saved';
      status = 'Saved to TraceMark.';
    } catch {
      showError('TraceMark could not save this quotation.');
    }
  }

  function showError(message: string): void {
    phase = 'error';
    status = '';
    error = message;
  }
</script>

<svelte:head>
  <title>Save to TraceMark</title>
</svelte:head>

<main>
  <header>
    <span class="eyebrow">TraceMark</span>
    <h1>Save quotation</h1>
  </header>

  {#if draft}
    <blockquote>{draft.quote}</blockquote>
    <p class="source">
      <span>{draft.title}</span>
      <a href={draft.url} target="_blank" rel="noreferrer">View source</a>
    </p>
  {:else if phase === 'loading'}
    <div class="placeholder" aria-hidden="true"></div>
  {/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      void save();
    }}
  >
    <label>
      Collection
      <select bind:value={collectionId} disabled={collections.length === 0 || phase === 'saving'}>
        {#each collections as collection (collection.id)}
          <option value={collection.id}>{collection.name}</option>
        {/each}
      </select>
    </label>

    <label>
      Tags
      <input bind:value={tagsText} placeholder="research, evidence" disabled={phase === 'saving'} />
    </label>

    <label>
      My note
      <textarea bind:value={note} rows="3" disabled={phase === 'saving'}></textarea>
    </label>

    {#if error}
      <p class="message error" role="alert">{error}</p>
    {:else}
      <p class="message" role="status">{status}</p>
    {/if}

    <button type="submit" disabled={!canSave}>Save quotation</button>
  </form>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    min-width: 360px;
    color: #162a29;
    background: #f7f2e8;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
  }

  main {
    width: 360px;
    padding: 22px;
  }

  header {
    margin-bottom: 16px;
  }

  .eyebrow {
    color: #176b68;
    font-size: 0.72rem;
    font-weight: 750;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  h1 {
    margin: 4px 0 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.55rem;
    font-weight: 600;
  }

  blockquote {
    max-height: 130px;
    margin: 0;
    overflow: auto;
    border-left: 3px solid #2a8c87;
    padding: 10px 12px;
    color: #243c3a;
    background: #fffaf1;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.98rem;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .source {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: 8px 0 18px;
    color: #5c6d69;
    font-size: 0.75rem;
  }

  .source span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  a {
    flex: none;
    color: #176b68;
  }

  form,
  label {
    display: grid;
    gap: 7px;
  }

  form {
    gap: 13px;
  }

  label {
    color: #344a47;
    font-size: 0.78rem;
    font-weight: 700;
  }

  input,
  select,
  textarea,
  button {
    width: 100%;
    border: 1px solid #b9c2bd;
    border-radius: 8px;
    padding: 9px 10px;
    color: #162a29;
    background: #fffdf8;
    font: inherit;
  }

  textarea {
    resize: vertical;
  }

  :is(input, select, textarea, button):focus-visible {
    outline: 3px solid rgb(42 140 135 / 30%);
    outline-offset: 2px;
  }

  button {
    border-color: #176b68;
    color: white;
    background: #176b68;
    font-weight: 750;
    cursor: pointer;
  }

  button:disabled {
    cursor: default;
    opacity: 0.5;
  }

  .message {
    min-height: 1.2em;
    margin: 0;
    color: #52635f;
    font-size: 0.78rem;
  }

  .error {
    color: #8a2e2e;
  }

  .placeholder {
    height: 95px;
    margin-bottom: 18px;
    border-radius: 8px;
    background: #e9e2d6;
  }

  @media (prefers-reduced-motion: no-preference) {
    button {
      transition:
        background 120ms ease,
        opacity 120ms ease;
    }
  }
</style>
