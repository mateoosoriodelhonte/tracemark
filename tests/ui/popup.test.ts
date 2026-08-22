// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, test, vi } from 'vitest';
import App from '../../src/entrypoints/popup/App.svelte';
import { INBOX_COLLECTION_ID } from '../../src/domain/constants';
import type { MessageRequest, MessageResponse } from '../../src/messaging/protocol';
import { makeCollection, makeHighlight } from '../helpers/fixtures';

const capture = {
  quote: 'Exact quote from the page',
  prefix: 'Before ',
  suffix: ' after',
  title: 'Research article',
  url: 'https://example.com/article',
};

function popupRequest(options: { captureError?: boolean } = {}) {
  return vi.fn(async (request: MessageRequest): Promise<MessageResponse> => {
    switch (request.type) {
      case 'capture.current':
        return options.captureError
          ? { ok: false, code: 'NO_SELECTION', message: 'Select text on the page before saving' }
          : { ok: true, data: capture };
      case 'collections.list':
        return {
          ok: true,
          data: [
            makeCollection({
              id: INBOX_COLLECTION_ID,
              name: 'Inbox',
              normalizedName: 'inbox',
            }),
          ],
        };
      case 'highlights.create':
        return {
          ok: true,
          data: makeHighlight({
            ...request.input,
            id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
            hostname: 'example.com',
            searchText: 'exact quote from the page',
            searchTokens: ['exact', 'quote', 'from', 'the', 'page'],
          }),
        };
      case 'highlights.list':
        return { ok: true, data: [] };
      case 'anchors.apply':
        return { ok: true, data: { status: 'not-found' } };
    }
  });
}

afterEach(cleanup);

describe('popup capture flow', () => {
  test('loads the current selection and saves user annotations to the chosen collection', async () => {
    const request = popupRequest();
    render(App, { props: { request } });

    expect(await screen.findByText(capture.quote)).toBeInTheDocument();
    await fireEvent.input(screen.getByLabelText('Tags'), { target: { value: 'RAG, Evidence' } });
    await fireEvent.input(screen.getByLabelText('My note'), {
      target: { value: 'Check this in the primary paper.' },
    });
    await fireEvent.click(screen.getByRole('button', { name: 'Save quotation' }));

    await waitFor(() =>
      expect(request).toHaveBeenCalledWith({
        type: 'highlights.create',
        input: {
          ...capture,
          collectionId: INBOX_COLLECTION_ID,
          tags: ['RAG', 'Evidence'],
          note: 'Check this in the primary paper.',
        },
      }),
    );
    expect(await screen.findByText('Saved to TraceMark.')).toBeInTheDocument();
  });

  test('shows a useful empty-selection state and keeps save disabled', async () => {
    render(App, { props: { request: popupRequest({ captureError: true }) } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Select text on the page before saving',
    );
    expect(screen.getByRole('button', { name: 'Save quotation' })).toBeDisabled();
  });
});
