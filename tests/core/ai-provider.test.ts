import { describe, expect, test, vi } from 'vitest';
import { NoAIProvider } from '../../src/core/ai-provider';
import { OllamaProvider } from '../../src/core/ollama-provider';

const selectedItem = {
  id: '6f3f6066-69e2-48c0-9d55-f273a22a830e',
  quote: 'Selected research explains the retrieval trade-off.',
  title: 'Selected article',
  url: 'https://example.com/selected',
  tags: ['retrieval'],
  note: 'Keep this focused.',
  prefix: 'unrelated research before the selected quotation',
  suffix: 'unrelated research after the selected quotation',
  context: 'unrelated research page context',
  collectionId: '8e6469f9-77ab-41dd-9df6-618c4821f15b',
  canonicalUrl: 'https://example.com/canonical',
  searchText: 'unrelated research search index',
};

function ollamaResponse(content: Record<string, unknown>): Response {
  return {
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue(
      JSON.stringify({
        message: { role: 'assistant', content: JSON.stringify(content) },
      }),
    ),
  } as unknown as Response;
}

function responseWithText(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
  return JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as Record<string, unknown>;
}

describe('NoAIProvider', () => {
  test.each([
    [
      'summarize',
      (provider: NoAIProvider) => provider.summarize({ items: [selectedItem] }, 'llama3.2'),
    ],
    [
      'explain',
      (provider: NoAIProvider) => provider.explain({ items: [selectedItem] }, 'llama3.2'),
    ],
    [
      'suggestTags',
      (provider: NoAIProvider) => provider.suggestTags({ items: [selectedItem] }, 'llama3.2'),
    ],
    [
      'overview',
      (provider: NoAIProvider) => provider.overview({ items: [selectedItem] }, 'llama3.2'),
    ],
  ] as const)('%s rejects without making any request', async (_, run) => {
    const provider = new NoAIProvider();

    await expect(run(provider)).rejects.toMatchObject({
      code: 'AI_DISABLED',
    });
  });
});

describe('OllamaProvider requests', () => {
  test('sends only selected research with the exact safe request options and text schema', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse({ content: 'Concise answer.' }));
    const provider = new OllamaProvider({ fetch: fetchMock, timeoutMs: 30_000 });

    await expect(provider.summarize({ items: [selectedItem] }, 'llama3.2')).resolves.toEqual({
      content: 'Concise answer.',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:11434/api/chat',
      expect.objectContaining({
        method: 'POST',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      }),
    );
    const body = requestBody(fetchMock);
    expect(body).toMatchObject({ model: 'llama3.2', stream: false });
    expect(body.format).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['content'],
      properties: { content: { type: 'string' } },
    });
    expect(JSON.stringify(body)).toContain('Selected research explains the retrieval trade-off.');
    expect(JSON.stringify(body)).not.toContain('unrelated research');
    expect(JSON.stringify(body)).not.toContain('canonicalUrl');
    expect(JSON.stringify(body)).toContain('untrusted quoted material');
  });

  test('uses the tag schema only for tag suggestions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(ollamaResponse({ tags: ['retrieval', 'ai'] }));
    const provider = new OllamaProvider({ fetch: fetchMock, timeoutMs: 30_000 });

    await expect(provider.suggestTags({ items: [selectedItem] }, 'llama3.2')).resolves.toEqual({
      tags: ['retrieval', 'ai'],
    });

    expect(requestBody(fetchMock).format).toEqual({
      type: 'object',
      additionalProperties: false,
      required: ['tags'],
      properties: { tags: { type: 'array', items: { type: 'string' } } },
    });
  });
});

describe('OllamaProvider validation and failures', () => {
  test('maps an aborted request to AI_TIMEOUT and clears its timer', async () => {
    let timeout: (() => void) | undefined;
    const clearTimer = vi.fn();
    const fetchMock = vi.fn(
      (_: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          );
        }),
    );
    const provider = new OllamaProvider({
      fetch: fetchMock,
      timeoutMs: 1,
      setTimer: (callback) => {
        timeout = callback;
        return 123 as unknown as ReturnType<typeof setTimeout>;
      },
      clearTimer,
    });

    const result = provider.summarize({ items: [selectedItem] }, 'llama3.2');
    timeout?.();

    await expect(result).rejects.toMatchObject({ code: 'AI_TIMEOUT' });
    expect(clearTimer).toHaveBeenCalledWith(123);
  });

  test('maps a rejected fetch to AI_UNAVAILABLE without exposing its reason', async () => {
    const provider = new OllamaProvider({
      fetch: vi.fn().mockRejectedValue(new Error('private connection details')),
    });

    await expect(provider.summarize({ items: [selectedItem] }, 'llama3.2')).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
      message: 'Local AI is unavailable',
    });
  });

  test('maps a missing-model response to AI_MODEL_UNAVAILABLE', async () => {
    const provider = new OllamaProvider({
      fetch: vi.fn().mockResolvedValue(responseWithText(404, 'model not found')),
    });

    await expect(
      provider.summarize({ items: [selectedItem] }, 'missing-model'),
    ).rejects.toMatchObject({
      code: 'AI_MODEL_UNAVAILABLE',
    });
  });

  test('maps non-model HTTP failures to AI_UNAVAILABLE', async () => {
    const provider = new OllamaProvider({
      fetch: vi.fn().mockResolvedValue(responseWithText(500, 'internal details')),
    });

    await expect(provider.summarize({ items: [selectedItem] }, 'llama3.2')).rejects.toMatchObject({
      code: 'AI_UNAVAILABLE',
      message: 'Local AI is unavailable',
    });
  });

  test.each([
    ['an oversized response', responseWithText(200, 'x'.repeat(1_048_577)), 'summary' as const],
    ['malformed outer JSON', responseWithText(200, '{'), 'summary' as const],
    [
      'missing assistant content',
      responseWithText(200, JSON.stringify({ message: { role: 'assistant' } })),
      'summary' as const,
    ],
    [
      'malformed assistant content JSON',
      responseWithText(200, JSON.stringify({ message: { role: 'assistant', content: '{' } })),
      'summary' as const,
    ],
    [
      'extra text-output fields',
      ollamaResponse({ content: 'Answer', extra: 'unexpected' }),
      'summary' as const,
    ],
    ['blank text output', ollamaResponse({ content: '   ' }), 'summary' as const],
    ['duplicate tag output', ollamaResponse({ tags: ['retrieval', 'retrieval'] }), 'tags' as const],
    ['invalid tag output', ollamaResponse({ tags: [''] }), 'tags' as const],
  ])('rejects %s as AI_INVALID_OUTPUT', async (_, response, kind) => {
    const provider = new OllamaProvider({ fetch: vi.fn().mockResolvedValue(response) });

    const result =
      kind === 'tags'
        ? provider.suggestTags({ items: [selectedItem] }, 'llama3.2')
        : provider.summarize({ items: [selectedItem] }, 'llama3.2');

    await expect(result).rejects.toMatchObject({
      code: 'AI_INVALID_OUTPUT',
      message: 'Local AI returned invalid output',
    });
  });

  test('keeps hostile model content as ordinary text', async () => {
    const provider = new OllamaProvider({
      fetch: vi.fn().mockResolvedValue(ollamaResponse({ content: '<img src=x onerror=alert(1)>' })),
    });

    await expect(provider.explain({ items: [selectedItem] }, 'llama3.2')).resolves.toEqual({
      content: '<img src=x onerror=alert(1)>',
    });
  });
});
