// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from '../../src/entrypoints/sidepanel/App.svelte';
import type { Settings } from '../../src/domain/models';
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
const settings: Settings = {
  id: 'settings',
  schemaVersion: 1,
  theme: 'system',
  ai: { provider: 'none', model: 'llama3.2' },
};

function libraryRequest() {
  return vi.fn(async (request: MessageRequest): Promise<MessageResponse> => {
    switch (request.type) {
      case 'settings.get':
        return { ok: true, data: settings };
      case 'settings.theme.set':
        return { ok: true, data: { ...settings, theme: request.theme } };
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
        return { ok: true, data: [hostileHighlight] };
      case 'tags.list':
        return { ok: true, data: hostileHighlight.tags };
      case 'highlights.update':
        return { ok: true, data: { ...hostileHighlight, ...request.input } };
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
    }
    throw new Error('Unexpected library request');
  });
}

afterEach(cleanup);

describe('research library side panel', () => {
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
