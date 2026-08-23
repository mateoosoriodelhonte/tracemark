// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from '../../src/entrypoints/sidepanel/App.svelte';
import type { AIResult, Highlight, Settings } from '../../src/domain/models';
import type { MessageRequest, MessageResponse } from '../../src/messaging/protocol';
import { INBOX_ID, makeCollection, makeHighlight } from '../helpers/fixtures';

const inbox = makeCollection({
  id: INBOX_ID,
  name: 'Inbox',
  normalizedName: 'inbox',
});
const collection = makeCollection();
const hostileHighlight = makeHighlight({
  title: '<img src=x onerror=alert(1)>',
  quote: '<script>alert(1)</script>',
});
const secondHighlight = makeHighlight({
  id: '95a521e9-0c6a-4a25-81a0-57b43ab704ac',
  title: 'Notes on Evidence and Provenance',
  quote: 'A durable research trail keeps each claim attached to its source.',
  url: 'https://example.org/evidence',
  canonicalUrl: 'https://example.org/evidence',
  hostname: 'example.org',
});
const settings: Settings = {
  id: 'settings',
  schemaVersion: 1,
  theme: 'system',
  ai: { provider: 'none', model: 'llama3.2' },
};
function libraryRequest(
  savedSettings: Settings = settings,
  savedHighlights: Highlight[] = [hostileHighlight],
  aiResult?: AIResult,
) {
  return vi.fn(async (request: MessageRequest): Promise<MessageResponse> => {
    switch (request.type) {
      case 'settings.get':
        return { ok: true, data: savedSettings };
      case 'settings.theme.set':
        return { ok: true, data: { ...savedSettings, theme: request.theme } };
      case 'settings.ai.set':
        return {
          ok: true,
          data: { ...savedSettings, ai: { provider: request.provider, model: request.model } },
        };
      case 'collections.list':
        return { ok: true, data: [inbox, collection] };
      case 'collections.create':
        return { ok: true, data: makeCollection({ name: request.name }) };
      case 'collections.rename':
        return { ok: true, data: { ...collection, name: request.name } };
      case 'collections.archive':
        return {
          ok: true,
          data: { ...collection, status: request.archived ? 'archived' : 'active' },
        };
      case 'collections.delete':
      case 'highlights.delete':
        return { ok: true, data: { status: 'deleted' } };
      case 'research.search':
        return { ok: true, data: savedHighlights };
      case 'tags.list':
        return { ok: true, data: [...new Set(savedHighlights.flatMap(({ tags }) => tags))] };
      case 'highlights.update':
        return { ok: true, data: { ...savedHighlights[0]!, ...request.input } };
      case 'anchors.apply':
        return { ok: true, data: { status: 'marked', count: 1 } };
      case 'backups.export':
        return {
          ok: true,
          data: {
            format: request.format,
            filename: `tracemark.${request.format === 'json' ? 'json' : 'md'}`,
            content: 'backup',
          },
        };
      case 'backups.import':
        return {
          ok: true,
          data: {
            collections: 2,
            highlights: 1,
            aiResults: 0,
            created: { collections: 1, highlights: 1, aiResults: 0 },
            updated: { collections: 0, highlights: 0, aiResults: 0 },
            skipped: { collections: 1, highlights: 0, aiResults: 0 },
            regenerated: { collections: 0, highlights: 0, aiResults: 0 },
            rejected: { collections: 0, highlights: 0, aiResults: 0 },
          },
        };
      case 'capture.current':
        return { ok: false, code: 'NO_SELECTION', message: 'No selection' };
      case 'highlights.create':
        return { ok: true, data: hostileHighlight };
      case 'ai.run':
        return aiResult
          ? { ok: true, data: aiResult }
          : { ok: false, code: 'AI_DISABLED', message: 'Local AI is disabled' };
    }
    throw new Error('Unexpected library request');
  });
}

afterEach(cleanup);

describe('research library side panel', () => {
  test('keeps Firefox local AI disabled when built-in data consent is unsupported', async () => {
    const request = libraryRequest();
    const requestLocalAIPermissions = vi.fn().mockResolvedValue('unsupported');
    render(App, { props: { request, requestLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.click(screen.getByRole('button', { name: 'Enable local AI' }));

    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'settings.ai.set' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/firefox data-consent support/i);
  });

  test('fails closed before dispatch when a local AI grant was revoked outside TraceMark', async () => {
    const generated: AIResult = {
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1,
      kind: 'summary',
      provider: 'ollama',
      sourceHighlightIds: [hostileHighlight.id],
      content: 'This must not be returned without consent.',
      createdAt: '2026-08-22T18:00:00.000Z',
    };
    const request = libraryRequest(
      { ...settings, ai: { provider: 'ollama', model: 'llama3.2' } },
      [hostileHighlight],
      generated,
    );
    const hasLocalAIPermissions = vi.fn().mockResolvedValue(false);
    const removeLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, {
      props: { request, hasLocalAIPermissions, removeLocalAIPermissions },
    });
    await screen.findByText('<script>alert(1)</script>');
    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
    );

    await fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));

    await waitFor(() => expect(hasLocalAIPermissions).toHaveBeenCalledOnce());
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ai.run' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /permission.*removed or unavailable/i,
    );
  });

  test('requests Ollama permission only after explicit consent and preserves disabled settings on denial', async () => {
    const request = libraryRequest();
    const requestLocalAIPermissions = vi.fn().mockResolvedValue('denied');
    const rollbackLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, {
      props: { request, requestLocalAIPermissions, rollbackLocalAIPermissions },
    });
    await screen.findByText('<script>alert(1)</script>');

    expect(requestLocalAIPermissions).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'settings.ai.set' }));

    await fireEvent.click(screen.getByRole('button', { name: 'Enable local AI' }));

    expect(requestLocalAIPermissions).toHaveBeenCalledOnce();
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'settings.ai.set' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission.*not granted/i);
  });

  test('enables the chosen local model without running AI', async () => {
    const request = libraryRequest();
    const requestLocalAIPermissions = vi.fn().mockResolvedValue('granted');
    render(App, { props: { request, requestLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.input(screen.getByRole('textbox', { name: 'Ollama model' }), {
      target: { value: 'qwen2.5:7b' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Enable local AI' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'settings.ai.set',
        provider: 'ollama',
        model: 'qwen2.5:7b',
      }),
    );
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ai.run' }));
  });

  test('rejects an invalid model before requesting permission and restores the persisted model', async () => {
    const request = libraryRequest();
    const requestLocalAIPermissions = vi.fn().mockResolvedValue('granted');
    render(App, { props: { request, requestLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');
    const modelInput = screen.getByRole('textbox', { name: 'Ollama model' });

    await fireEvent.input(modelInput, { target: { value: 'model name with spaces' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Enable local AI' }));

    expect(requestLocalAIPermissions).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'settings.ai.set' }));
    expect(modelInput).toHaveValue('llama3.2');
    expect(screen.getByRole('alert')).toHaveTextContent(/valid ollama model/i);
  });

  test('revokes newly granted permission when enabling settings cannot be persisted', async () => {
    const baseRequest = libraryRequest();
    const request = vi.fn((message: MessageRequest): Promise<MessageResponse> => {
      if (message.type === 'settings.ai.set') {
        return Promise.resolve({
          ok: false,
          code: 'INTERNAL_ERROR',
          message: 'TraceMark could not save local AI settings.',
        });
      }
      return baseRequest(message);
    });
    const requestLocalAIPermissions = vi.fn().mockResolvedValue('granted');
    const rollbackLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, {
      props: { request, requestLocalAIPermissions, rollbackLocalAIPermissions },
    });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.click(screen.getByRole('button', { name: 'Enable local AI' }));

    await waitFor(() => expect(rollbackLocalAIPermissions).toHaveBeenCalledOnce());
    expect(screen.getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enable local AI' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      /could not enable.*permission was removed/i,
    );
  });

  test('retains a permission-removal retry after enable rollback fails', async () => {
    const baseRequest = libraryRequest();
    const request = vi.fn((message: MessageRequest): Promise<MessageResponse> => {
      if (message.type === 'settings.ai.set') {
        return Promise.resolve({
          ok: false,
          code: 'INTERNAL_ERROR',
          message: 'TraceMark could not save local AI settings.',
        });
      }
      return baseRequest(message);
    });
    const requestLocalAIPermissions = vi.fn().mockResolvedValue('granted');
    const rollbackLocalAIPermissions = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(App, {
      props: { request, requestLocalAIPermissions, rollbackLocalAIPermissions },
    });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.click(screen.getByRole('button', { name: 'Enable local AI' }));
    const retry = await screen.findByRole('button', { name: 'Retry permission removal' });
    const enable = screen.getByRole('button', { name: 'Enable local AI' });

    expect(screen.getByRole('alert')).toHaveTextContent(/permission could not be removed/i);
    expect(enable).toBeDisabled();
    await fireEvent.click(enable);
    expect(requestLocalAIPermissions).toHaveBeenCalledOnce();
    await fireEvent.click(retry);
    await waitFor(() => expect(rollbackLocalAIPermissions).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Retry permission removal' })).toBeNull(),
    );
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  test('reload with disabled settings surfaces residual permission cleanup without auto-removing', async () => {
    const request = libraryRequest();
    const hasAnyLocalAIPermissions = vi.fn().mockResolvedValue(true);
    const removeLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, {
      props: { request, hasAnyLocalAIPermissions, removeLocalAIPermissions },
    });

    const retry = await screen.findByRole('button', { name: 'Retry permission removal' });
    const enable = screen.getByRole('button', { name: 'Enable local AI' });
    expect(enable).toBeDisabled();
    expect(removeLocalAIPermissions).not.toHaveBeenCalled();

    await fireEvent.click(retry);

    await waitFor(() => expect(removeLocalAIPermissions).toHaveBeenCalledOnce());
    await waitFor(() => expect(enable).toBeEnabled());
  });

  test('disables AI before attempting to remove Ollama permission', async () => {
    const request = libraryRequest({
      ...settings,
      ai: { provider: 'ollama', model: 'llama3.2' },
    });
    const removeLocalAIPermissions = vi.fn(async () => {
      expect(request).toHaveBeenCalledWith({
        type: 'settings.ai.set',
        provider: 'none',
        model: 'llama3.2',
      });
      throw new Error('Browser permission could not be removed.');
    });
    render(App, { props: { request, removeLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.click(screen.getByRole('button', { name: 'Disable local AI' }));

    expect(removeLocalAIPermissions).toHaveBeenCalledOnce();
    expect(await screen.findByRole('alert')).toHaveTextContent(/permission could not be removed/i);
    expect(screen.getByRole('button', { name: 'Enable local AI' })).toBeInTheDocument();
  });

  test('disables with the last persisted model after an invalid unsaved edit', async () => {
    const request = libraryRequest({
      ...settings,
      ai: { provider: 'ollama', model: 'llama3.2' },
    });
    const removeLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, { props: { request, removeLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');
    const modelInput = screen.getByRole('textbox', { name: 'Ollama model' });

    await fireEvent.input(modelInput, { target: { value: 'invalid model name' } });
    await fireEvent.click(screen.getByRole('button', { name: 'Disable local AI' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'settings.ai.set',
        provider: 'none',
        model: 'llama3.2',
      }),
    );
    expect(modelInput).toHaveValue('llama3.2');
  });

  test('does not dispatch local AI while a disable mutation is pending', async () => {
    const enabledSettings: Settings = {
      ...settings,
      ai: { provider: 'ollama', model: 'llama3.2' },
    };
    const baseRequest = libraryRequest(enabledSettings);
    let finishDisable: (response: MessageResponse) => void = () => undefined;
    const pendingDisable = new Promise<MessageResponse>((resolve) => {
      finishDisable = resolve;
    });
    const request = vi.fn((message: MessageRequest): Promise<MessageResponse> => {
      if (message.type === 'settings.ai.set' && message.provider === 'none') {
        return pendingDisable;
      }
      return baseRequest(message);
    });
    const removeLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, { props: { request, removeLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');
    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
    );
    const summarize = screen.getByRole('button', { name: 'Summarize' });

    await fireEvent.click(screen.getByRole('button', { name: 'Disable local AI' }));
    await fireEvent.click(summarize);

    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ai.run' }));
    expect(summarize).toBeDisabled();
    finishDisable({
      ok: true,
      data: { ...enabledSettings, ai: { provider: 'none', model: 'llama3.2' } },
    });
    await screen.findByRole('button', { name: 'Enable local AI' });
  });

  test('runs one local task for exactly the checked research and renders hostile output as text', async () => {
    const enabledSettings: Settings = {
      ...settings,
      ai: { provider: 'ollama', model: 'llama3.2' },
    };
    const generated: AIResult = {
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1,
      kind: 'tags',
      provider: 'ollama',
      sourceHighlightIds: [hostileHighlight.id, secondHighlight.id],
      content: '<img src=x onerror=alert(1)>',
      suggestedTags: ['evidence', 'review'],
      createdAt: '2026-08-22T18:00:00.000Z',
    };
    const request = libraryRequest(enabledSettings, [hostileHighlight, secondHighlight], generated);
    const hasLocalAIPermissions = vi.fn().mockResolvedValue(true);
    const { container } = render(App, { props: { request, hasLocalAIPermissions } });
    await screen.findByText(secondHighlight.quote);

    for (const name of ['Summarize', 'Explain', 'Suggest tags', 'Overview']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
    );
    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${secondHighlight.title}` }),
    );
    expect(screen.getByText('2 selected')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Suggest tags' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'ai.run',
        kind: 'tags',
        sourceHighlightIds: [hostileHighlight.id, secondHighlight.id],
      }),
    );
    const output = await screen.findByRole('region', {
      name: 'Based on 2 selected quotations',
    });
    expect(within(output).getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(within(output).getByText('#evidence')).toBeInTheDocument();
    expect(within(output).getByText('#review')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
  });

  test('clears checked research whenever search results reload', async () => {
    const request = libraryRequest({ ...settings, ai: { provider: 'ollama', model: 'llama3.2' } }, [
      hostileHighlight,
      secondHighlight,
    ]);
    const hasLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, { props: { request, hasLocalAIPermissions } });
    await screen.findByText(secondHighlight.quote);

    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
    );
    expect(screen.getByRole('button', { name: 'Summarize' })).toBeEnabled();
    await fireEvent.input(screen.getByRole('searchbox', { name: 'Search research' }), {
      target: { value: 'evidence' },
    });
    await fireEvent.submit(screen.getByRole('search'));

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
      ).not.toBeChecked(),
    );
    expect(screen.getByText('0 selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Summarize' })).toBeDisabled();
  });

  test('removes a deleted quotation from selection before the next local AI request', async () => {
    const generated: AIResult = {
      id: '5d84d7d8-b47e-47b2-a44f-a25491ac9234',
      schemaVersion: 1,
      kind: 'summary',
      provider: 'ollama',
      sourceHighlightIds: [secondHighlight.id],
      content: 'A summary of the remaining visible quotation.',
      createdAt: '2026-08-22T18:00:00.000Z',
    };
    const request = libraryRequest(
      { ...settings, ai: { provider: 'ollama', model: 'llama3.2' } },
      [hostileHighlight, secondHighlight],
      generated,
    );
    const hasLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, { props: { request, hasLocalAIPermissions } });
    await screen.findByText(secondHighlight.quote);

    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
    );
    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${secondHighlight.title}` }),
    );
    await fireEvent.click(screen.getByRole('button', { name: `Edit ${hostileHighlight.title}` }));
    const dialog = screen.getByRole('dialog', { name: 'Edit saved quotation' });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete quotation' }));
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm deletion' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Edit saved quotation' })).toBeNull(),
    );
    expect(screen.queryByRole('checkbox', { name: `Select ${hostileHighlight.title}` })).toBeNull();
    expect(screen.getByRole('checkbox', { name: `Select ${secondHighlight.title}` })).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'ai.run',
        kind: 'summary',
        sourceHighlightIds: [secondHighlight.id],
      }),
    );
    expect(request).not.toHaveBeenCalledWith({
      type: 'ai.run',
      kind: 'summary',
      sourceHighlightIds: [hostileHighlight.id, secondHighlight.id],
    });
  });

  test('persists an edited enabled model without running AI', async () => {
    const request = libraryRequest({
      ...settings,
      ai: { provider: 'ollama', model: 'llama3.2' },
    });
    render(App, { props: { request } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.change(screen.getByRole('textbox', { name: 'Ollama model' }), {
      target: { value: 'mistral-nemo:latest' },
    });

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'settings.ai.set',
        provider: 'ollama',
        model: 'mistral-nemo:latest',
      }),
    );
    expect(request).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'ai.run' }));
  });

  test('shows local task progress and safe errors without hiding the research library', async () => {
    const baseRequest = libraryRequest({
      ...settings,
      ai: { provider: 'ollama', model: 'llama3.2' },
    });
    let finishAI: (response: MessageResponse) => void = () => undefined;
    const pendingAI = new Promise<MessageResponse>((resolve) => {
      finishAI = resolve;
    });
    const request = vi.fn((message: MessageRequest) =>
      message.type === 'ai.run' ? pendingAI : baseRequest(message),
    );
    const hasLocalAIPermissions = vi.fn().mockResolvedValue(true);
    render(App, { props: { request, hasLocalAIPermissions } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.click(
      screen.getByRole('checkbox', { name: `Select ${hostileHighlight.title}` }),
    );
    await fireEvent.click(screen.getByRole('button', { name: 'Summarize' }));

    expect(await screen.findByText('Working locally…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Summarize' })).toBeDisabled();
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();

    finishAI({
      ok: false,
      code: 'AI_UNAVAILABLE',
      message: 'Ollama is not running on this device.',
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Ollama is not running on this device.',
    );
    expect(screen.getByText('<script>alert(1)</script>')).toBeInTheDocument();
  });

  test('renders hostile research as text and loads local filters through typed requests', async () => {
    const request = libraryRequest();
    const { container } = render(App, { props: { request } });

    expect(await screen.findByText('<script>alert(1)</script>')).toBeInTheDocument();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(request).toHaveBeenCalledWith({ type: 'collections.list', includeArchived: true });
    expect(request).toHaveBeenCalledWith({ type: 'tags.list', limit: 500 });
    expect(request).toHaveBeenCalledWith({
      type: 'research.search',
      input: { query: '', includeArchived: false },
    });

    await fireEvent.click(screen.getByRole('button', { name: 'Mark on page' }));
    expect(request).toHaveBeenCalledWith({
      type: 'anchors.apply',
      highlightId: hostileHighlight.id,
    });
  });

  test('searches and edits a saved quotation with labeled keyboard-accessible controls', async () => {
    const request = libraryRequest();
    render(App, { props: { request } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.input(screen.getByRole('searchbox', { name: 'Search research' }), {
      target: { value: 'evidence' },
    });
    await fireEvent.submit(screen.getByRole('search'));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'research.search',
        input: { query: 'evidence', includeArchived: false },
      }),
    );

    await fireEvent.click(
      screen.getByRole('button', { name: 'Edit <img src=x onerror=alert(1)>' }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Edit saved quotation' });
    expect(within(dialog).getByLabelText('Collection')).toHaveFocus();
    await fireEvent.input(within(dialog).getByLabelText('My note'), {
      target: { value: 'Updated note' },
    });
    await fireEvent.input(within(dialog).getByLabelText('Tags'), {
      target: { value: 'evidence, primary' },
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'highlights.update',
        highlightId: hostileHighlight.id,
        input: {
          collectionId: hostileHighlight.collectionId,
          tags: ['evidence', 'primary'],
          note: 'Updated note',
        },
      }),
    );

    const editButton = screen.getByRole('button', { name: 'Edit <img src=x onerror=alert(1)>' });
    await fireEvent.click(editButton);
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Edit saved quotation' })).toBeNull();
    await waitFor(() => expect(editButton).toHaveFocus());
  });

  test('creates collections and persists an explicit theme preference', async () => {
    const request = libraryRequest();
    const { container } = render(App, { props: { request } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.change(screen.getByLabelText('Theme'), { target: { value: 'dark' } });
    expect(container.querySelector('[data-theme="dark"]')).not.toBeNull();
    expect(request).toHaveBeenCalledWith({ type: 'settings.theme.set', theme: 'dark' });

    await fireEvent.click(screen.getByRole('button', { name: 'Manage collections' }));
    const dialog = screen.getByRole('dialog', { name: 'Manage collections' });
    await fireEvent.input(within(dialog).getByLabelText('New collection name'), {
      target: { value: 'System Design' },
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'collections.create',
        name: 'System Design',
      }),
    );

    await fireEvent.click(within(dialog).getByRole('button', { name: 'RAG Research' }));
    await fireEvent.input(within(dialog).getByLabelText('Collection name'), {
      target: { value: 'Retrieval Notes' },
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Save name' }));
    expect(request).toHaveBeenCalledWith({
      type: 'collections.rename',
      collectionId: collection.id,
      name: 'Retrieval Notes',
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Archive collection' }));
    expect(request).toHaveBeenCalledWith({
      type: 'collections.archive',
      collectionId: collection.id,
      archived: true,
    });
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Delete collection' }));
    await fireEvent.click(
      within(dialog).getByRole('button', { name: 'Move items to Inbox and delete' }),
    );
    expect(request).toHaveBeenCalledWith({
      type: 'collections.delete',
      collectionId: collection.id,
      confirmed: true,
    });
  });

  test('makes local backup guidance and both export formats obvious', async () => {
    const request = libraryRequest();
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tracemark');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(App, { props: { request } });
    await screen.findByText('<script>alert(1)</script>');

    await fireEvent.click(screen.getByRole('button', { name: 'Backups' }));
    const dialog = screen.getByRole('dialog', { name: 'Back up TraceMark' });
    expect(
      within(dialog).getByText(/browser storage is not a durable backup/i),
    ).toBeInTheDocument();
    await fireEvent.click(within(dialog).getByRole('button', { name: 'Download JSON backup' }));
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({ type: 'backups.export', format: 'json' }),
    );

    const file = new File(['backup'], 'tracemark.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: vi.fn().mockResolvedValue('backup') });
    await fireEvent.change(within(dialog).getByLabelText('Choose TraceMark JSON backup'), {
      target: { files: [file] },
    });
    const restore = await within(dialog).findByRole('button', {
      name: 'Validate and merge backup',
    });
    await fireEvent.click(restore);
    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'backups.import',
        content: 'backup',
        confirmed: true,
      }),
    );

    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
    click.mockRestore();
  });

  test('keeps accessibility, responsive, theme, motion, and hostile-rendering guards in source', () => {
    const source = readFileSync('src/entrypoints/sidepanel/App.svelte', 'utf8');

    expect(source).toContain(':focus-visible');
    expect(source).toContain('showModal');
    expect(source).toContain('@media (max-width: 340px)');
    expect(source).toContain("[data-theme='dark']");
    expect(source).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(source).not.toContain('{@html');
    expect(source).not.toContain('innerHTML');
  });
});
