<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { ZodType } from 'zod';
  import {
    createLocalAIPermissionManager,
    type LocalAIPermissionApi,
    type LocalAIPermissionManager,
    type LocalAIPermissionRequestResult,
  } from '../../core/local-ai-permissions';
  import { INBOX_COLLECTION_ID } from '../../domain/constants';
  import type {
    AIResult,
    AIResultKind,
    Collection,
    Highlight,
    ThemePreference,
  } from '../../domain/models';
  import {
    AIResultSchema,
    AnchorRuntimeResultSchema,
    BackupExportSchema,
    BackupImportResultSchema,
    CollectionSchema,
    HighlightSchema,
    SettingsSchema,
  } from '../../domain/schemas';
  import { sendRequest } from '../../messaging/client';
  import {
    DeleteResultSchema,
    ModelNameSchema,
    TagListSchema,
    type MessageRequest,
    type MessageResponse,
  } from '../../messaging/protocol';

  type Request = (message: MessageRequest) => Promise<MessageResponse>;
  type DialogName = 'edit' | 'collections' | 'backup';
  const MAX_BACKUP_FILE_SIZE = 20_000_000;
  interface Props {
    request?: Request;
    requestLocalAIPermissions?: () => Promise<LocalAIPermissionRequestResult>;
    rollbackLocalAIPermissions?: () => Promise<boolean>;
    removeLocalAIPermissions?: () => Promise<boolean>;
    hasLocalAIPermissions?: () => Promise<boolean>;
    hasAnyLocalAIPermissions?: () => Promise<boolean>;
  }

  let defaultPermissionManager: LocalAIPermissionManager | undefined;
  function localAIPermissions(): LocalAIPermissionManager {
    defaultPermissionManager ??= createLocalAIPermissionManager(
      browser.permissions as unknown as LocalAIPermissionApi,
      import.meta.env.FIREFOX,
    );
    return defaultPermissionManager;
  }

  let {
    request = sendRequest,
    requestLocalAIPermissions = () => localAIPermissions().request(),
    rollbackLocalAIPermissions = () => localAIPermissions().rollbackRequest(),
    removeLocalAIPermissions = () => localAIPermissions().remove(),
    hasLocalAIPermissions = () => localAIPermissions().has(),
    hasAnyLocalAIPermissions = () => localAIPermissions().hasAny(),
  }: Props = $props();
  let highlights = $state<Highlight[]>([]);
  let collections = $state<Collection[]>([]);
  let knownTags = $state<string[]>([]);
  let theme = $state<ThemePreference>('system');
  let query = $state('');
  let collectionFilter = $state('');
  let tagFilter = $state('');
  let includeArchived = $state(false);
  let phase = $state<'loading' | 'ready' | 'error'>('loading');
  let status = $state('Loading your local research…');
  let error = $state('');
  let aiProvider = $state<'none' | 'ollama'>('none');
  let aiModel = $state('llama3.2');
  let persistedAIModel = $state('llama3.2');
  let aiBusy = $state(false);
  let aiError = $state('');
  let aiTaskBusy = $state(false);
  let aiResult = $state<AIResult>();
  let permissionRemovalPending = $state(false);
  let permissionRemovalMode = $state<'rollback' | 'remove'>('remove');
  let selectedHighlightIds = $state<string[]>([]);
  let activeDialog = $state<DialogName>();
  let returnFocus = $state<HTMLElement>();
  let dialogCloseButton = $state<HTMLButtonElement>();

  let editing = $state<Highlight>();
  let editCollectionId = $state('');
  let editTags = $state('');
  let editNote = $state('');
  let deleteHighlightPending = $state(false);
  let firstEditField = $state<HTMLSelectElement>();

  let newCollectionName = $state('');
  let adminCollectionId = $state('');
  let adminCollectionName = $state('');
  let deleteCollectionPending = $state(false);

  let pendingBackup = $state('');
  let pendingBackupName = $state('');
  let backupBusy = $state(false);

  const activeCollections = $derived(
    collections.filter((collection) => collection.status === 'active'),
  );
  const adminCollection = $derived(
    collections.find((collection) => collection.id === adminCollectionId),
  );

  onMount(() => void loadLibrary());

  async function dataFor<T>(message: MessageRequest, schema: ZodType<T>): Promise<T> {
    const response = await request(message);
    if (!response.ok) throw new Error(response.message);
    const parsed = schema.safeParse(response.data);
    if (!parsed.success) throw new Error('TraceMark received invalid local data.');
    return parsed.data;
  }

  function showError(cause: unknown, fallback: string): void {
    error = cause instanceof Error && cause.message.length > 0 ? cause.message : fallback;
    status = '';
    phase = 'error';
  }

  async function loadLibrary(): Promise<void> {
    phase = 'loading';
    error = '';
    try {
      const [savedSettings, savedCollections, savedTags] = await Promise.all([
        dataFor({ type: 'settings.get' }, SettingsSchema),
        dataFor({ type: 'collections.list', includeArchived: true }, CollectionSchema.array()),
        dataFor({ type: 'tags.list', limit: 500 }, TagListSchema),
      ]);
      theme = savedSettings.theme;
      aiProvider = savedSettings.ai.provider;
      aiModel = savedSettings.ai.model;
      persistedAIModel = savedSettings.ai.model;
      await reconcileDisabledLocalAIPermissions();
      collections = savedCollections;
      knownTags = savedTags;
      await loadResearch();
      phase = 'ready';
    } catch (loadError) {
      showError(loadError, 'TraceMark could not load your local research.');
    }
  }

  async function loadResearch(): Promise<void> {
    error = '';
    const input = {
      query,
      ...(collectionFilter ? { collectionId: collectionFilter } : {}),
      ...(tagFilter ? { tag: tagFilter } : {}),
      includeArchived,
    };
    try {
      const loadedHighlights = await dataFor(
        { type: 'research.search', input },
        HighlightSchema.array(),
      );
      selectedHighlightIds = [];
      highlights = loadedHighlights;
      knownTags = [...new Set([...knownTags, ...highlights.flatMap(({ tags }) => tags)])].sort(
        (left, right) => left.localeCompare(right),
      );
      status =
        highlights.length === 1
          ? '1 saved quotation.'
          : `${highlights.length.toLocaleString()} saved quotations.`;
    } catch (loadError) {
      showError(loadError, 'TraceMark could not search your library.');
    }
  }

  async function reloadCollections(): Promise<void> {
    collections = await dataFor(
      { type: 'collections.list', includeArchived: true },
      CollectionSchema.array(),
    );
    if (collectionFilter && !collections.some(({ id }) => id === collectionFilter)) {
      collectionFilter = '';
    }
  }

  function openDialog(name: DialogName, trigger: EventTarget | null): void {
    activeDialog = name;
    returnFocus = trigger instanceof HTMLElement ? trigger : undefined;
    void tick().then(() => dialogCloseButton?.focus());
  }

  function modalDialog(node: HTMLDialogElement): { destroy(): void } {
    if (typeof node.showModal === 'function') node.showModal();
    else node.setAttribute('open', '');
    return {
      destroy() {
        if (node.open && typeof node.close === 'function') node.close();
      },
    };
  }

  function closeDialog(): void {
    activeDialog = undefined;
    editing = undefined;
    deleteHighlightPending = false;
    deleteCollectionPending = false;
    pendingBackup = '';
    pendingBackupName = '';
    const target = returnFocus;
    returnFocus = undefined;
    void tick().then(() => target?.focus());
  }

  function openEditor(highlight: Highlight, trigger: EventTarget | null): void {
    editing = highlight;
    editCollectionId = highlight.collectionId;
    editTags = highlight.tags.join(', ');
    editNote = highlight.note;
    deleteHighlightPending = false;
    openDialog('edit', trigger);
    void tick().then(() => firstEditField?.focus());
  }

  async function saveHighlight(): Promise<void> {
    if (!editing) return;
    try {
      const updated = await dataFor(
        {
          type: 'highlights.update',
          highlightId: editing.id,
          input: {
            collectionId: editCollectionId,
            tags: editTags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
            note: editNote,
          },
        },
        HighlightSchema,
      );
      highlights = highlights.map((item) => (item.id === updated.id ? updated : item));
      status = 'Saved changes.';
      closeDialog();
    } catch (saveError) {
      showError(saveError, 'TraceMark could not save these changes.');
    }
  }

  async function deleteHighlight(): Promise<void> {
    if (!editing) return;
    const deletedHighlightId = editing.id;
    try {
      await dataFor(
        { type: 'highlights.delete', highlightId: deletedHighlightId, confirmed: true },
        DeleteResultSchema,
      );
      highlights = highlights.filter(({ id }) => id !== deletedHighlightId);
      selectedHighlightIds = selectedHighlightIds.filter((id) => id !== deletedHighlightId);
      status = 'Deleted saved quotation.';
      closeDialog();
    } catch (deleteError) {
      showError(deleteError, 'TraceMark could not delete this quotation.');
    }
  }

  async function createCollection(): Promise<void> {
    if (!newCollectionName.trim()) return;
    try {
      await dataFor({ type: 'collections.create', name: newCollectionName }, CollectionSchema);
      newCollectionName = '';
      await reloadCollections();
      status = 'Created collection.';
    } catch (createError) {
      showError(createError, 'TraceMark could not create this collection.');
    }
  }

  function selectAdminCollection(collection: Collection): void {
    adminCollectionId = collection.id;
    adminCollectionName = collection.name;
    deleteCollectionPending = false;
  }

  async function renameCollection(): Promise<void> {
    if (!adminCollection || adminCollection.id === INBOX_COLLECTION_ID) return;
    try {
      await dataFor(
        {
          type: 'collections.rename',
          collectionId: adminCollection.id,
          name: adminCollectionName,
        },
        CollectionSchema,
      );
      await reloadCollections();
      status = 'Renamed collection.';
    } catch (renameError) {
      showError(renameError, 'TraceMark could not rename this collection.');
    }
  }

  async function archiveCollection(): Promise<void> {
    if (!adminCollection || adminCollection.id === INBOX_COLLECTION_ID) return;
    const wasActive = adminCollection.status === 'active';
    try {
      await dataFor(
        {
          type: 'collections.archive',
          collectionId: adminCollection.id,
          archived: wasActive,
        },
        CollectionSchema,
      );
      await reloadCollections();
      status = wasActive ? 'Archived collection.' : 'Restored collection.';
    } catch (archiveError) {
      showError(archiveError, 'TraceMark could not update this collection.');
    }
  }

  async function deleteCollection(): Promise<void> {
    if (!adminCollection || adminCollection.id === INBOX_COLLECTION_ID) return;
    try {
      await dataFor(
        { type: 'collections.delete', collectionId: adminCollection.id, confirmed: true },
        DeleteResultSchema,
      );
      adminCollectionId = '';
      adminCollectionName = '';
      deleteCollectionPending = false;
      await reloadCollections();
      await loadResearch();
      status = 'Deleted collection. Its quotations are in Inbox.';
    } catch (deleteError) {
      showError(deleteError, 'TraceMark could not delete this collection.');
    }
  }

  async function setTheme(): Promise<void> {
    try {
      const saved = await dataFor({ type: 'settings.theme.set', theme }, SettingsSchema);
      theme = saved.theme;
      status = `Theme set to ${theme}.`;
    } catch (themeError) {
      showError(themeError, 'TraceMark could not save this theme.');
    }
  }

  async function enableLocalAI(): Promise<void> {
    if (permissionRemovalPending) return;
    aiBusy = true;
    aiError = '';
    const model = ModelNameSchema.safeParse(aiModel);
    if (!model.success) {
      aiModel = persistedAIModel;
      aiError = 'Enter a valid Ollama model name before enabling local AI.';
      aiBusy = false;
      return;
    }
    aiModel = model.data;

    let permissionResult: LocalAIPermissionRequestResult;
    try {
      permissionResult = await requestLocalAIPermissions();
    } catch {
      aiError = 'Local AI permissions could not be requested. Local AI remains disabled.';
      aiBusy = false;
      return;
    }
    if (permissionResult === 'unsupported') {
      aiError =
        'Firefox data-consent support is unavailable in this version. Local AI remains disabled.';
      aiBusy = false;
      return;
    }
    if (permissionResult === 'cleanup-required') {
      permissionRemovalPending = true;
      permissionRemovalMode = 'rollback';
      aiError = 'Remove the outstanding Local AI permission before enabling again.';
      aiBusy = false;
      return;
    }
    if (permissionResult === 'denied') {
      const rolledBack = await tryRollbackLocalAIPermissions();
      permissionRemovalPending = !rolledBack;
      permissionRemovalMode = 'rollback';
      aiError = rolledBack
        ? 'Local AI permission was not granted. Local AI remains disabled.'
        : 'Local AI permission was not granted, and a newly granted permission could not be removed. Retry permission removal.';
      aiBusy = false;
      return;
    }

    try {
      const saved = await dataFor(
        { type: 'settings.ai.set', provider: 'ollama', model: model.data },
        SettingsSchema,
      );
      aiProvider = saved.ai.provider;
      aiModel = saved.ai.model;
      persistedAIModel = saved.ai.model;
      permissionRemovalPending = false;
      status = 'Local AI enabled. Select research before asking for assistance.';
    } catch {
      aiProvider = 'none';
      aiModel = persistedAIModel;
      const removed = await tryRollbackLocalAIPermissions();
      permissionRemovalPending = !removed;
      permissionRemovalMode = 'rollback';
      aiError = removed
        ? 'TraceMark could not enable local AI. Newly granted permission was removed.'
        : 'TraceMark could not enable local AI, and newly granted permission could not be removed. Retry permission removal.';
    } finally {
      aiBusy = false;
    }
  }

  async function disableLocalAI(): Promise<void> {
    aiBusy = true;
    aiError = '';
    try {
      const saved = await dataFor(
        { type: 'settings.ai.set', provider: 'none', model: persistedAIModel },
        SettingsSchema,
      );
      aiProvider = saved.ai.provider;
      aiModel = saved.ai.model;
      persistedAIModel = saved.ai.model;
    } catch (settingsError) {
      aiModel = persistedAIModel;
      aiError =
        settingsError instanceof Error && settingsError.message.length > 0
          ? settingsError.message
          : 'TraceMark could not disable local AI.';
      aiBusy = false;
      return;
    }

    try {
      const removed = await removeLocalAIPermissions();
      permissionRemovalPending = !removed;
      permissionRemovalMode = 'remove';
      if (!removed) aiError = 'Local AI permission could not be removed in browser settings.';
      else status = 'Local AI disabled and browser permissions removed.';
    } catch {
      permissionRemovalPending = true;
      permissionRemovalMode = 'remove';
      aiError = 'Local AI permission could not be removed in browser settings.';
    } finally {
      aiBusy = false;
    }
  }

  async function saveAIModel(model: string): Promise<void> {
    if (aiProvider !== 'ollama') return;
    aiBusy = true;
    aiError = '';
    const parsed = ModelNameSchema.safeParse(model);
    if (!parsed.success) {
      aiModel = persistedAIModel;
      aiError = 'Enter a valid Ollama model name.';
      aiBusy = false;
      return;
    }
    try {
      const saved = await dataFor(
        { type: 'settings.ai.set', provider: 'ollama', model: parsed.data },
        SettingsSchema,
      );
      aiModel = saved.ai.model;
      persistedAIModel = saved.ai.model;
      status = `Local AI model set to ${aiModel}.`;
    } catch (modelError) {
      aiModel = persistedAIModel;
      aiError =
        modelError instanceof Error && modelError.message.length > 0
          ? modelError.message
          : 'TraceMark could not save this Ollama model.';
    } finally {
      aiBusy = false;
    }
  }

  async function tryRollbackLocalAIPermissions(): Promise<boolean> {
    try {
      return await rollbackLocalAIPermissions();
    } catch {
      return false;
    }
  }

  async function tryRemoveLocalAIPermissions(): Promise<boolean> {
    try {
      return await removeLocalAIPermissions();
    } catch {
      return false;
    }
  }

  async function reconcileDisabledLocalAIPermissions(): Promise<void> {
    if (aiProvider !== 'none') return;
    try {
      if (await hasAnyLocalAIPermissions()) {
        permissionRemovalPending = true;
        permissionRemovalMode = 'remove';
        aiError =
          'Local AI is disabled, but browser permission remains. Remove it before enabling again.';
      }
    } catch {
      // A later explicit enable or cleanup action will check the browser again.
    }
  }

  async function retryOllamaPermissionRemoval(): Promise<void> {
    aiBusy = true;
    aiError = '';
    try {
      const removed =
        permissionRemovalMode === 'rollback'
          ? await tryRollbackLocalAIPermissions()
          : await tryRemoveLocalAIPermissions();
      permissionRemovalPending = !removed;
      if (removed) status = 'Local AI permissions removed. Local AI remains disabled.';
      else aiError = 'Local AI permission could not be removed in browser settings.';
    } finally {
      aiBusy = false;
    }
  }

  function setSelected(highlightId: string, selected: boolean): void {
    if (selected) {
      if (selectedHighlightIds.length >= 20 || selectedHighlightIds.includes(highlightId)) return;
      selectedHighlightIds = [...selectedHighlightIds, highlightId];
      return;
    }
    selectedHighlightIds = selectedHighlightIds.filter((id) => id !== highlightId);
  }

  async function runLocalAI(kind: AIResultKind): Promise<void> {
    if (aiProvider !== 'ollama' || aiBusy || aiTaskBusy) return;
    const visibleHighlightIds = new Set(highlights.map(({ id }) => id));
    const sourceHighlightIds = selectedHighlightIds.filter((id) => visibleHighlightIds.has(id));
    if (sourceHighlightIds.length !== selectedHighlightIds.length) {
      selectedHighlightIds = sourceHighlightIds;
    }
    if (sourceHighlightIds.length === 0) return;
    aiTaskBusy = true;
    aiError = '';
    try {
      if (!(await hasLocalAIPermissions())) {
        aiProvider = 'none';
        try {
          const saved = await dataFor(
            { type: 'settings.ai.set', provider: 'none', model: persistedAIModel },
            SettingsSchema,
          );
          aiModel = saved.ai.model;
          persistedAIModel = saved.ai.model;
        } catch {
          // The in-memory provider still fails closed even if settings cannot be persisted.
        }
        permissionRemovalPending = !(await tryRemoveLocalAIPermissions());
        permissionRemovalMode = 'remove';
        aiError = 'Local AI permission was removed or unavailable. Local AI is now disabled.';
        return;
      }
      aiResult = await dataFor({ type: 'ai.run', kind, sourceHighlightIds }, AIResultSchema);
      status = `Generated local AI output from ${sourceHighlightIds.length.toLocaleString()} selected quotation${sourceHighlightIds.length === 1 ? '' : 's'}.`;
    } catch (assistanceError) {
      aiError =
        assistanceError instanceof Error && assistanceError.message.length > 0
          ? assistanceError.message
          : 'TraceMark could not generate local AI assistance.';
    } finally {
      aiTaskBusy = false;
    }
  }

  async function applyAnchor(highlight: Highlight): Promise<void> {
    try {
      const result = await dataFor(
        { type: 'anchors.apply', highlightId: highlight.id },
        AnchorRuntimeResultSchema,
      );
      if (result.status === 'marked') status = 'Marked the saved quotation on this page.';
      if (result.status === 'ambiguous')
        status = 'The quotation appears more than once, so TraceMark did not guess.';
      if (result.status === 'not-found')
        status = 'The source changed and this quotation could not be found safely.';
      if (result.status === 'unsupported') status = 'This page cannot be highlighted.';
    } catch (anchorError) {
      showError(anchorError, 'Open the saved source page before marking this quotation.');
    }
  }

  async function exportBackup(format: 'json' | 'markdown'): Promise<void> {
    backupBusy = true;
    try {
      const exported = await dataFor(
        {
          type: 'backups.export',
          format,
          ...(format === 'markdown' && collectionFilter ? { collectionId: collectionFilter } : {}),
        },
        BackupExportSchema,
      );
      const type = format === 'json' ? 'application/json' : 'text/markdown';
      const url = URL.createObjectURL(new Blob([exported.content], { type }));
      const link = document.createElement('a');
      link.href = url;
      link.download = exported.filename;
      link.click();
      URL.revokeObjectURL(url);
      status = `Downloaded ${exported.filename}.`;
    } catch (exportError) {
      showError(exportError, 'TraceMark could not create this export.');
    } finally {
      backupBusy = false;
    }
  }

  async function chooseBackup(event: Event): Promise<void> {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_FILE_SIZE) {
      showError(
        new Error('Choose a TraceMark backup smaller than 20 MB.'),
        'The file is too large.',
      );
      return;
    }
    try {
      pendingBackup = await file.text();
      pendingBackupName = file.name;
    } catch (fileError) {
      showError(fileError, 'TraceMark could not read this backup file.');
    }
  }

  async function restoreBackup(): Promise<void> {
    if (!pendingBackup) return;
    backupBusy = true;
    try {
      const result = await dataFor(
        { type: 'backups.import', content: pendingBackup, confirmed: true },
        BackupImportResultSchema,
      );
      await loadLibrary();
      const changed = result.created.highlights + result.updated.highlights;
      status = `Merged ${changed.toLocaleString()} quotations; skipped ${result.skipped.highlights.toLocaleString()} duplicates.`;
      closeDialog();
    } catch (restoreError) {
      showError(restoreError, 'TraceMark could not restore this backup.');
    } finally {
      backupBusy = false;
    }
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape' && activeDialog) closeDialog();
  }}
/>

<svelte:head>
  <title>TraceMark Research Library</title>
</svelte:head>

<div class="app-shell" data-theme={theme}>
  <header class="topbar">
    <div class="brand-lockup">
      <span class="brand-mark" aria-hidden="true">T</span>
      <div>
        <span class="eyebrow">TraceMark</span>
        <h1>Research library</h1>
      </div>
    </div>
    <label class="theme-picker">
      <span>Theme</span>
      <select bind:value={theme} onchange={() => void setTheme()}>
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  </header>

  <main>
    <section class="intro" aria-labelledby="library-heading">
      <div>
        <p class="kicker">Private by design · stored on this device</p>
        <h2 id="library-heading">The useful part, with the source attached.</h2>
      </div>
      <div class="utility-actions">
        <button
          type="button"
          class="quiet-button"
          onclick={(event) => openDialog('collections', event.currentTarget)}
          >Manage collections</button
        >
        <button
          type="button"
          class="quiet-button"
          onclick={(event) => openDialog('backup', event.currentTarget)}>Backups</button
        >
      </div>
    </section>

    <section class="ai-panel" aria-labelledby="local-ai-heading">
      <div class="ai-panel-heading">
        <div>
          <p class="kicker">Optional · private by default</p>
          <h2 id="local-ai-heading">Local AI</h2>
        </div>
        <span class:enabled={aiProvider === 'ollama'} class="ai-state"
          >{aiProvider === 'ollama' ? 'Enabled' : 'Disabled'}</span
        >
      </div>
      <p class="ai-explanation">
        {#if aiProvider === 'ollama'}
          Assistance uses your selected research and the Ollama model running on this device.
        {:else}
          {#if import.meta.env.FIREFOX}
            Enabling asks separately for website-content data consent and access only to
            <code>127.0.0.1:11434</code>.
          {:else}
            Enabling grants access only to <code>127.0.0.1:11434</code>.
          {/if}
          It does not start Ollama, download models, or contact a cloud service.
        {/if}
      </p>
      <div class="ai-settings">
        <label
          ><span>Ollama model</span><input
            bind:value={aiModel}
            autocomplete="off"
            onchange={(event) => void saveAIModel(event.currentTarget.value)}
          /></label
        >
        {#if aiProvider === 'ollama'}
          <button
            type="button"
            class="quiet-button"
            disabled={aiBusy}
            onclick={() => void disableLocalAI()}>Disable local AI</button
          >
        {:else}
          <button
            type="button"
            class="primary-button"
            disabled={aiBusy || permissionRemovalPending || phase === 'loading' || !aiModel.trim()}
            onclick={() => void enableLocalAI()}>Enable local AI</button
          >
        {/if}
        {#if permissionRemovalPending}
          <button
            type="button"
            class="quiet-button"
            disabled={aiBusy}
            onclick={() => void retryOllamaPermissionRemoval()}>Retry permission removal</button
          >
        {/if}
      </div>
      {#if aiProvider === 'ollama'}
        <div class="ai-actions">
          <p role="status" aria-live="polite">
            {selectedHighlightIds.length.toLocaleString()} selected
          </p>
          <div class="button-grid" aria-label="Local AI actions">
            <button
              type="button"
              class="quiet-button"
              disabled={selectedHighlightIds.length === 0 || aiBusy || aiTaskBusy}
              onclick={() => void runLocalAI('summary')}>Summarize</button
            >
            <button
              type="button"
              class="quiet-button"
              disabled={selectedHighlightIds.length === 0 || aiBusy || aiTaskBusy}
              onclick={() => void runLocalAI('explanation')}>Explain</button
            >
            <button
              type="button"
              class="quiet-button"
              disabled={selectedHighlightIds.length === 0 || aiBusy || aiTaskBusy}
              onclick={() => void runLocalAI('tags')}>Suggest tags</button
            >
            <button
              type="button"
              class="quiet-button"
              disabled={selectedHighlightIds.length === 0 || aiBusy || aiTaskBusy}
              onclick={() => void runLocalAI('overview')}>Overview</button
            >
          </div>
          {#if aiTaskBusy}<p class="ai-progress" role="status">Working locally…</p>{/if}
        </div>
        {#if aiResult}
          <section class="ai-result" aria-labelledby="local-ai-result-heading">
            <div>
              <p class="eyebrow">Local AI output</p>
              <h3 id="local-ai-result-heading">
                Based on {aiResult.sourceHighlightIds.length.toLocaleString()} selected quotation{aiResult
                  .sourceHighlightIds.length === 1
                  ? ''
                  : 's'}
              </h3>
            </div>
            <p class="ai-result-content">{aiResult.content}</p>
            {#if aiResult.suggestedTags}
              <div class="chips suggested-tags" aria-label="Suggested tags">
                {#each aiResult.suggestedTags as tag (tag)}<span>#{tag}</span>{/each}
              </div>
              <p class="ai-result-note">Suggestions are not applied automatically.</p>
            {/if}
          </section>
        {/if}
      {/if}
      {#if aiError}<p class="ai-error" role="alert">{aiError}</p>{/if}
    </section>

    <form
      class="search-panel"
      role="search"
      onsubmit={(event) => {
        event.preventDefault();
        void loadResearch();
      }}
    >
      <label class="search-field">
        <span>Search research</span>
        <div class="input-wrap">
          <span aria-hidden="true">⌕</span><input
            type="search"
            bind:value={query}
            placeholder="Quote, note, tag, source…"
          />
        </div>
      </label>
      <button type="submit" class="primary-button">Search</button>
      <div class="filters" aria-label="Library filters">
        <label
          ><span>Collection</span><select
            bind:value={collectionFilter}
            onchange={() => void loadResearch()}
          >
            <option value="">All collections</option>
            {#each collections as collection (collection.id)}
              <option value={collection.id}
                >{collection.name}{collection.status === 'archived' ? ' · Archived' : ''}</option
              >
            {/each}
          </select></label
        >
        <label
          ><span>Tag</span><select bind:value={tagFilter} onchange={() => void loadResearch()}>
            <option value="">All tags</option>
            {#each knownTags as tag (tag)}<option value={tag}>{tag}</option>{/each}
          </select></label
        >
        <label class="check-field"
          ><input
            type="checkbox"
            bind:checked={includeArchived}
            onchange={() => void loadResearch()}
          /><span>Include archived</span></label
        >
      </div>
    </form>

    <div class="result-bar">
      <p class="result-count" role="status" aria-live="polite">{status}</p>
      {#if query || collectionFilter || tagFilter || includeArchived}
        <button
          type="button"
          class="text-button"
          onclick={() => {
            query = '';
            collectionFilter = '';
            tagFilter = '';
            includeArchived = false;
            void loadResearch();
          }}>Clear filters</button
        >
      {/if}
    </div>

    {#if error}
      <div class="notice error-notice" role="alert">
        <strong>TraceMark needs attention</strong><span>{error}</span>
        <button type="button" class="text-button" onclick={() => void loadLibrary()}
          >Try again</button
        >
      </div>
    {:else if phase === 'loading'}
      <div class="loading-grid" aria-label="Loading saved quotations">
        <div></div>
        <div></div>
        <div></div>
      </div>
    {:else if highlights.length === 0}
      <section class="empty-state">
        <span aria-hidden="true">⌁</span>
        <h3>No quotations found</h3>
        <p>Try a broader search, or select text on a webpage and save it from TraceMark.</p>
      </section>
    {:else}
      <section class="research-list" aria-label="Saved quotations">
        {#each highlights as highlight (highlight.id)}
          <article class="research-card">
            <label class="card-select">
              <input
                type="checkbox"
                aria-label={`Select ${highlight.title}`}
                checked={selectedHighlightIds.includes(highlight.id)}
                disabled={selectedHighlightIds.length >= 20 &&
                  !selectedHighlightIds.includes(highlight.id)}
                onchange={(event) =>
                  setSelected(highlight.id, (event.currentTarget as HTMLInputElement).checked)}
              />
              <span aria-hidden="true">Select</span>
            </label>
            <div class="card-meta">
              <span class="source-host">{highlight.hostname}</span><span aria-hidden="true">·</span>
              <time datetime={highlight.createdAt}
                >{new Date(highlight.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}</time
              >
            </div>
            <blockquote>{highlight.quote}</blockquote>
            <h3>{highlight.title}</h3>
            {#if highlight.note}<p class="note"><span>Note</span>{highlight.note}</p>{/if}
            <div class="chips" aria-label="Tags and collection">
              <span class="collection-chip"
                >{collections.find(({ id }) => id === highlight.collectionId)?.name ??
                  'Unknown'}</span
              >
              {#each highlight.tags as tag (tag)}<span>#{tag}</span>{/each}
            </div>
            <div class="card-actions">
              <a href={highlight.url} target="_blank" rel="noreferrer">Open source</a>
              <button type="button" class="text-button" onclick={() => void applyAnchor(highlight)}
                >Mark on page</button
              >
              <button
                type="button"
                class="text-button"
                aria-label={`Edit ${highlight.title}`}
                onclick={(event) => openEditor(highlight, event.currentTarget)}>Edit</button
              >
            </div>
          </article>
        {/each}
      </section>
    {/if}
  </main>

  <footer><span>Local-first. No account required.</span><span>Schema v1</span></footer>

  {#if activeDialog === 'edit' && editing}
    <div class="dialog-backdrop">
      <dialog
        use:modalDialog
        aria-labelledby="edit-dialog-title"
        oncancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
      >
        <header class="dialog-header">
          <div>
            <span class="eyebrow">Saved quotation</span>
            <h2 id="edit-dialog-title">Edit saved quotation</h2>
          </div>
          <button
            bind:this={dialogCloseButton}
            type="button"
            class="icon-button"
            aria-label="Close dialog"
            onclick={closeDialog}>×</button
          >
        </header>
        <p class="dialog-quote">“{editing.quote}”</p>
        <form
          class="dialog-form"
          onsubmit={(event) => {
            event.preventDefault();
            void saveHighlight();
          }}
        >
          <label
            ><span>Collection</span><select
              bind:this={firstEditField}
              bind:value={editCollectionId}
            >
              {#each activeCollections as collection (collection.id)}<option value={collection.id}
                  >{collection.name}</option
                >{/each}
            </select></label
          >
          <label
            ><span>Tags</span><input
              bind:value={editTags}
              placeholder="research, evidence"
            /></label
          >
          <label><span>My note</span><textarea bind:value={editNote} rows="5"></textarea></label>
          <div class="dialog-actions">
            <button type="button" class="quiet-button" onclick={closeDialog}>Cancel</button>
            <button type="submit" class="primary-button">Save changes</button>
          </div>
        </form>
        <div class="danger-zone">
          {#if deleteHighlightPending}
            <p role="alert">Delete this saved quotation permanently?</p>
            <button type="button" class="danger-button" onclick={() => void deleteHighlight()}
              >Confirm deletion</button
            >
            <button
              type="button"
              class="text-button"
              onclick={() => (deleteHighlightPending = false)}>Keep quotation</button
            >
          {:else}
            <button
              type="button"
              class="text-button danger-text"
              onclick={() => (deleteHighlightPending = true)}>Delete quotation</button
            >
          {/if}
        </div>
      </dialog>
    </div>
  {/if}

  {#if activeDialog === 'collections'}
    <div class="dialog-backdrop">
      <dialog
        use:modalDialog
        aria-labelledby="collections-dialog-title"
        oncancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
      >
        <header class="dialog-header">
          <div>
            <span class="eyebrow">Organization</span>
            <h2 id="collections-dialog-title">Manage collections</h2>
          </div>
          <button
            bind:this={dialogCloseButton}
            type="button"
            class="icon-button"
            aria-label="Close dialog"
            onclick={closeDialog}>×</button
          >
        </header>
        <form
          class="inline-create"
          onsubmit={(event) => {
            event.preventDefault();
            void createCollection();
          }}
        >
          <label
            ><span>New collection name</span><input
              bind:value={newCollectionName}
              placeholder="System Design"
            /></label
          >
          <button type="submit" class="primary-button">Create collection</button>
        </form>
        <div class="collection-manager">
          <nav aria-label="Collections">
            {#each collections as collection (collection.id)}
              <button
                type="button"
                aria-label={collection.name}
                class:active={adminCollectionId === collection.id}
                onclick={() => selectAdminCollection(collection)}
                ><span>{collection.name}</span><small>{collection.status}</small></button
              >
            {/each}
          </nav>
          {#if adminCollection}
            <section aria-label={`Edit ${adminCollection.name}`}>
              {#if adminCollection.id === INBOX_COLLECTION_ID}
                <p class="notice">Inbox is the safe default and cannot be renamed or deleted.</p>
              {:else}
                <label><span>Collection name</span><input bind:value={adminCollectionName} /></label
                >
                <div class="stacked-actions">
                  <button
                    type="button"
                    class="primary-button"
                    onclick={() => void renameCollection()}>Save name</button
                  >
                  <button
                    type="button"
                    class="quiet-button"
                    onclick={() => void archiveCollection()}
                    >{adminCollection.status === 'active'
                      ? 'Archive collection'
                      : 'Restore collection'}</button
                  >
                  {#if deleteCollectionPending}
                    <p role="alert">Its quotations will move to Inbox before deletion.</p>
                    <button
                      type="button"
                      class="danger-button"
                      onclick={() => void deleteCollection()}>Move items to Inbox and delete</button
                    >
                  {:else}
                    <button
                      type="button"
                      class="text-button danger-text"
                      onclick={() => (deleteCollectionPending = true)}>Delete collection</button
                    >
                  {/if}
                </div>
              {/if}
            </section>
          {:else}
            <p class="manager-hint">Choose a collection to rename, archive, or delete it.</p>
          {/if}
        </div>
      </dialog>
    </div>
  {/if}

  {#if activeDialog === 'backup'}
    <div class="dialog-backdrop">
      <dialog
        use:modalDialog
        aria-labelledby="backup-dialog-title"
        oncancel={(event) => {
          event.preventDefault();
          closeDialog();
        }}
      >
        <header class="dialog-header">
          <div>
            <span class="eyebrow">Local-first safety</span>
            <h2 id="backup-dialog-title">Back up TraceMark</h2>
          </div>
          <button
            bind:this={dialogCloseButton}
            type="button"
            class="icon-button"
            aria-label="Close dialog"
            onclick={closeDialog}>×</button
          >
        </header>
        <div class="notice backup-notice">
          <strong>Browser storage is not a durable backup.</strong>
          <span>Download a JSON backup regularly and keep it somewhere you trust.</span>
        </div>
        <section class="backup-section">
          <h3>Export</h3>
          <p>
            JSON preserves your full library. Markdown creates readable notes. Device theme and AI
            preferences are never imported.
          </p>
          <div class="button-grid">
            <button
              type="button"
              class="primary-button"
              disabled={backupBusy}
              onclick={() => void exportBackup('json')}>Download JSON backup</button
            >
            <button
              type="button"
              class="quiet-button"
              disabled={backupBusy}
              onclick={() => void exportBackup('markdown')}>Download Markdown</button
            >
          </div>
        </section>
        <section class="backup-section restore-section">
          <h3>Import</h3>
          <p>
            TraceMark validates the full file, preserves unrelated local research, and skips
            duplicates.
          </p>
          <label class="file-field"
            ><span>Choose TraceMark JSON backup</span><input
              type="file"
              accept="application/json,.json"
              onchange={(event) => void chooseBackup(event)}
            /></label
          >
          {#if pendingBackup}
            <div class="restore-confirmation">
              <p role="alert">
                <strong>{pendingBackupName}</strong> will be merged into this local library.
              </p>
              <button
                type="button"
                class="danger-button"
                disabled={backupBusy}
                onclick={() => void restoreBackup()}>Validate and merge backup</button
              >
            </div>
          {/if}
        </section>
      </dialog>
    </div>
  {/if}
</div>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(html) {
    min-width: 280px;
    background: #f3eee3;
  }

  :global(body) {
    margin: 0;
    min-width: 280px;
    min-height: 100vh;
    font-family:
      Inter,
      ui-sans-serif,
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      'Segoe UI',
      sans-serif;
  }

  :global(button),
  :global(input),
  :global(select),
  :global(textarea) {
    font: inherit;
  }

  .app-shell {
    --canvas: #f3eee3;
    --surface: #fffdf7;
    --raised: #fff;
    --text: #17312f;
    --muted: #586c67;
    --subtle: #e7e0d3;
    --border: #b9beb5;
    --accent: #0d6864;
    --accent-strong: #084e4b;
    --accent-soft: #dceeea;
    --danger: #963434;
    --danger-soft: #fae9e5;
    min-height: 100vh;
    color: var(--text);
    background:
      radial-gradient(circle at 90% -10%, rgb(13 104 100 / 12%), transparent 28rem), var(--canvas);
    color-scheme: light;
  }

  .app-shell[data-theme='dark'] {
    --canvas: #101c1b;
    --surface: #192826;
    --raised: #20312e;
    --text: #eef5ef;
    --muted: #adbbb7;
    --subtle: #293b38;
    --border: #52635e;
    --accent: #75d4ca;
    --accent-strong: #a1e7df;
    --accent-soft: #203f3b;
    --danger: #ffaaa0;
    --danger-soft: #432724;
    color-scheme: dark;
  }

  .topbar,
  main,
  footer {
    width: min(100%, 920px);
    margin-inline: auto;
  }

  .topbar,
  .brand-lockup,
  .utility-actions,
  .result-bar,
  .card-meta,
  .card-actions,
  .dialog-header,
  .dialog-actions,
  .button-grid {
    display: flex;
    align-items: center;
  }

  .topbar {
    justify-content: space-between;
    gap: 16px;
    border-bottom: 1px solid var(--border);
    padding: 16px clamp(16px, 4vw, 30px);
  }

  .brand-lockup {
    gap: 11px;
  }

  .brand-mark {
    display: grid;
    width: 34px;
    height: 34px;
    place-items: center;
    border-radius: 9px 9px 9px 2px;
    color: var(--surface);
    background: var(--accent-strong);
    font-family: Georgia, 'Times New Roman', serif;
    font-weight: 700;
  }

  .eyebrow,
  .kicker {
    color: var(--accent);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  h1,
  h2,
  h3,
  p {
    margin-top: 0;
  }

  h1 {
    margin-bottom: 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.12rem;
    font-weight: 600;
  }

  .theme-picker,
  label {
    display: grid;
    gap: 6px;
    color: var(--muted);
    font-size: 0.74rem;
    font-weight: 760;
  }

  .theme-picker {
    gap: 3px;
    font-size: 0.68rem;
  }

  main {
    padding: 26px clamp(16px, 4vw, 30px) 34px;
  }

  .intro {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 22px;
  }

  .intro h2 {
    max-width: 560px;
    margin: 4px 0 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: clamp(1.45rem, 5vw, 2.15rem);
    font-weight: 500;
    line-height: 1.12;
  }

  .kicker {
    margin-bottom: 0;
  }

  .utility-actions,
  .button-grid,
  .card-actions {
    flex-wrap: wrap;
    gap: 8px;
  }

  input,
  select,
  textarea {
    width: 100%;
    min-height: 38px;
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 8px 10px;
    color: var(--text);
    background: var(--raised);
  }

  textarea {
    resize: vertical;
  }

  :is(button, a, input, select, textarea):focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
    outline-offset: 2px;
  }

  button {
    min-height: 36px;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 7px 12px;
    cursor: pointer;
  }

  button:disabled {
    cursor: default;
    opacity: 0.55;
  }

  .primary-button {
    border-color: var(--accent-strong);
    color: var(--surface);
    background: var(--accent-strong);
    font-weight: 780;
  }

  .quiet-button {
    border-color: var(--border);
    color: var(--text);
    background: var(--surface);
    font-weight: 700;
  }

  .text-button {
    min-height: 30px;
    padding: 4px 6px;
    color: var(--accent-strong);
    background: transparent;
    font-size: 0.78rem;
    font-weight: 760;
  }

  .search-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    background: var(--surface);
    box-shadow: 0 8px 28px rgb(23 49 47 / 7%);
  }

  .ai-panel {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px;
    background: var(--surface);
  }

  .ai-panel-heading,
  .ai-settings {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 12px;
  }

  .ai-panel-heading h2 {
    margin: 3px 0 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.08rem;
  }

  .ai-state {
    border-radius: 999px;
    padding: 4px 8px;
    color: var(--muted);
    background: var(--subtle);
    font-size: 0.68rem;
    font-weight: 800;
  }

  .ai-state.enabled {
    color: var(--accent-strong);
    background: var(--accent-soft);
  }

  .ai-explanation,
  .ai-error {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
    line-height: 1.45;
  }

  .ai-explanation code {
    color: var(--text);
  }

  .ai-settings label {
    flex: 1;
  }

  .ai-error {
    color: var(--danger);
    font-weight: 700;
  }

  .ai-actions {
    display: grid;
    gap: 8px;
    border-top: 1px solid var(--subtle);
    padding-top: 10px;
  }

  .ai-actions > p,
  .ai-result-note {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
  }

  .ai-result {
    display: grid;
    gap: 9px;
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    padding: 12px;
    background: var(--raised);
  }

  .ai-result h3 {
    margin: 3px 0 0;
    font-size: 0.82rem;
  }

  .ai-result-content {
    margin: 0;
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.5;
    white-space: pre-wrap;
  }

  .suggested-tags {
    margin-bottom: 0;
  }

  .ai-progress {
    color: var(--accent);
    font-weight: 700;
  }

  .input-wrap {
    position: relative;
  }

  .input-wrap span {
    position: absolute;
    top: 50%;
    left: 11px;
    translate: 0 -50%;
    color: var(--muted);
    font-size: 1.2rem;
  }

  .input-wrap input {
    padding-left: 34px;
  }

  .search-panel > .primary-button {
    align-self: end;
  }

  .filters {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: repeat(2, minmax(0, 1fr)) auto;
    align-items: end;
    gap: 10px;
    border-top: 1px solid var(--subtle);
    padding-top: 11px;
  }

  .check-field {
    display: flex;
    min-height: 38px;
    align-items: center;
    gap: 7px;
  }

  .check-field input {
    width: 17px;
    min-height: 17px;
    accent-color: var(--accent-strong);
  }

  .result-bar {
    min-height: 48px;
    justify-content: space-between;
    gap: 12px;
  }

  .result-count {
    margin: 0;
    color: var(--muted);
    font-size: 0.78rem;
  }

  .research-list,
  .loading-grid {
    display: grid;
    gap: 12px;
  }

  .research-card {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 17px;
    background: var(--surface);
    box-shadow: 0 7px 22px rgb(23 49 47 / 5%);
  }

  .research-card::before {
    position: absolute;
    inset: 0 auto 0 0;
    width: 3px;
    background: var(--accent);
    content: '';
  }

  .card-select {
    position: absolute;
    top: 13px;
    right: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 0.7rem;
  }

  .card-select input {
    width: 17px;
    min-height: 17px;
    accent-color: var(--accent-strong);
  }

  .card-meta {
    padding-right: 72px;
    gap: 7px;
    color: var(--muted);
    font-size: 0.7rem;
  }

  .source-host {
    color: var(--accent);
    font-weight: 800;
  }

  blockquote {
    margin: 11px 0 9px;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.05rem;
    line-height: 1.48;
    white-space: pre-wrap;
  }

  .research-card h3 {
    margin-bottom: 9px;
    font-size: 0.8rem;
  }

  .note {
    margin-bottom: 10px;
    border-left: 2px solid var(--subtle);
    padding-left: 9px;
    color: var(--muted);
    font-size: 0.78rem;
    white-space: pre-wrap;
  }

  .note span {
    display: block;
    color: var(--text);
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 11px;
  }

  .chips span {
    border-radius: 999px;
    padding: 4px 7px;
    color: var(--muted);
    background: var(--subtle);
    font-size: 0.68rem;
    font-weight: 700;
  }

  .chips .collection-chip {
    color: var(--accent-strong);
    background: var(--accent-soft);
  }

  .card-actions {
    border-top: 1px solid var(--subtle);
    padding-top: 9px;
  }

  .card-actions a {
    border-radius: 8px;
    padding: 6px;
    color: var(--accent-strong);
    font-size: 0.78rem;
    font-weight: 780;
  }

  .notice {
    display: grid;
    gap: 3px;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    color: var(--muted);
    background: var(--surface);
    font-size: 0.8rem;
  }

  .error-notice {
    border-color: var(--danger);
  }

  .empty-state {
    display: grid;
    min-height: 240px;
    place-items: center;
    align-content: center;
    border: 1px dashed var(--border);
    border-radius: 14px;
    padding: 28px;
    text-align: center;
  }

  .empty-state > span {
    color: var(--accent);
    font-size: 2rem;
  }

  .empty-state h3 {
    margin: 8px 0 4px;
  }

  .empty-state p {
    max-width: 360px;
    margin-bottom: 0;
    color: var(--muted);
    font-size: 0.82rem;
  }

  .loading-grid div {
    height: 150px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface);
  }

  footer {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--border);
    padding: 14px clamp(16px, 4vw, 30px) 20px;
    color: var(--muted);
    font-size: 0.67rem;
  }

  .dialog-backdrop {
    position: fixed;
    z-index: 20;
    inset: 0;
    display: grid;
    place-items: center;
    overflow: auto;
    padding: 16px;
    background: rgb(5 18 17 / 62%);
  }

  dialog {
    position: static;
    width: min(100%, 600px);
    max-height: calc(100vh - 32px);
    overflow: auto;
    margin: 0;
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 19px;
    color: var(--text);
    background: var(--raised);
    box-shadow: 0 24px 80px rgb(0 0 0 / 35%);
  }

  .dialog-header {
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 15px;
  }

  .dialog-header h2 {
    margin: 3px 0 0;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.42rem;
  }

  .icon-button {
    width: 36px;
    padding: 0;
    color: var(--muted);
    background: transparent;
    font-size: 1.5rem;
  }

  .dialog-quote {
    max-height: 110px;
    overflow: auto;
    border-left: 3px solid var(--accent);
    padding: 9px 11px;
    background: var(--accent-soft);
    font-family: Georgia, 'Times New Roman', serif;
  }

  .dialog-form,
  .inline-create,
  .backup-section,
  .stacked-actions {
    display: grid;
    gap: 12px;
  }

  .dialog-actions {
    justify-content: flex-end;
    gap: 8px;
  }

  .danger-zone,
  .restore-section {
    margin-top: 18px;
    border-top: 1px solid var(--subtle);
    padding-top: 12px;
  }

  .danger-button {
    border-color: var(--danger);
    color: var(--raised);
    background: var(--danger);
    font-weight: 780;
  }

  .danger-text,
  [role='alert'] {
    color: var(--danger);
  }

  .inline-create {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    border-bottom: 1px solid var(--subtle);
    padding-bottom: 16px;
  }

  .collection-manager {
    display: grid;
    grid-template-columns: minmax(130px, 0.75fr) minmax(0, 1.25fr);
    min-height: 210px;
    gap: 14px;
    padding-top: 14px;
  }

  .collection-manager nav {
    display: grid;
    align-content: start;
    gap: 5px;
  }

  .collection-manager nav button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: var(--text);
    background: transparent;
    text-align: left;
  }

  .collection-manager nav button.active {
    border-color: var(--border);
    background: var(--accent-soft);
  }

  .collection-manager small,
  .manager-hint,
  .backup-section p {
    color: var(--muted);
    font-size: 0.72rem;
  }

  .backup-notice {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .backup-section {
    margin-top: 18px;
  }

  .backup-section h3,
  .backup-section p {
    margin-bottom: 0;
  }

  .restore-confirmation {
    border-radius: 10px;
    padding: 11px;
    background: var(--danger-soft);
  }

  @media (max-width: 520px) {
    .topbar,
    .intro,
    .result-bar,
    .ai-settings {
      align-items: start;
      flex-wrap: wrap;
    }

    .ai-settings {
      flex-direction: column;
    }

    .filters,
    .collection-manager {
      grid-template-columns: 1fr;
    }

    .check-field {
      min-height: auto;
    }
  }

  @media (max-width: 340px) {
    main {
      padding-inline: 12px;
    }

    .search-panel,
    .inline-create {
      grid-template-columns: 1fr;
    }

    .search-panel > .primary-button {
      width: 100%;
    }
  }

  @media (prefers-color-scheme: dark) {
    .app-shell[data-theme='system'] {
      --canvas: #101c1b;
      --surface: #192826;
      --raised: #20312e;
      --text: #eef5ef;
      --muted: #adbbb7;
      --subtle: #293b38;
      --border: #52635e;
      --accent: #75d4ca;
      --accent-strong: #a1e7df;
      --accent-soft: #203f3b;
      --danger: #ffaaa0;
      --danger-soft: #432724;
      color-scheme: dark;
    }
  }

  @media (prefers-reduced-motion: no-preference) {
    button,
    a,
    .research-card {
      transition:
        border-color 130ms ease,
        background 130ms ease,
        translate 130ms ease;
    }

    .research-card:hover {
      translate: 0 -1px;
    }
  }
</style>
