import { INBOX_COLLECTION_ID } from '../domain/constants';
import type { CapturePageResult } from '../domain/capture-selection';
import type { CaptureResult } from '../domain/models';
import { CapturePageResultSchema } from '../domain/schemas';
import type { CreateHighlightInput } from './highlights';

export type CaptureErrorCode =
  'NO_SELECTION' | 'UNSUPPORTED_PAGE' | 'INVALID_CAPTURE' | 'MULTIPLE_SELECTIONS' | 'NO_ACTIVE_TAB';

export class CaptureError extends Error {
  constructor(
    readonly code: CaptureErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CaptureError';
  }
}

export interface ScriptInjection {
  target: { tabId: number } | { tabId: number; frameIds: number[] };
  files: string[];
}

export interface ScriptInjectionResult {
  frameId: number;
  result?: unknown;
  error?: unknown;
}

export interface CaptureServiceDependencies {
  executeScript(details: ScriptInjection): Promise<ScriptInjectionResult[]>;
  queryActiveTabs(): Promise<Array<{ id?: number }>>;
}

export class CaptureService {
  constructor(private readonly dependencies: CaptureServiceDependencies) {}

  async captureActiveTab(): Promise<CaptureResult> {
    const [tab] = await this.dependencies.queryActiveTabs();
    if (tab?.id === undefined) {
      throw new CaptureError('NO_ACTIVE_TAB', 'No active browser tab is available');
    }
    return this.captureTab(tab.id);
  }

  async captureTab(tabId: number, frameId?: number): Promise<CaptureResult> {
    if (!Number.isInteger(tabId) || tabId < 0 || (frameId !== undefined && frameId < 0)) {
      throw new CaptureError('INVALID_CAPTURE', 'Invalid tab or frame identifier');
    }

    let rawResults: ScriptInjectionResult[];
    try {
      rawResults = await this.dependencies.executeScript({
        target: frameId === undefined ? { tabId } : { tabId, frameIds: [frameId] },
        files: ['/content-scripts/capture.js'],
      });
    } catch (error) {
      throw new CaptureError('UNSUPPORTED_PAGE', 'This browser page cannot be captured', {
        cause: error,
      });
    }

    if (rawResults.length === 0) {
      throw new CaptureError('INVALID_CAPTURE', 'The page returned no capture result');
    }

    const results: CapturePageResult[] = [];
    for (const { result } of rawResults) {
      const parsed = CapturePageResultSchema.safeParse(result);
      if (!parsed.success) {
        throw new CaptureError('INVALID_CAPTURE', 'The page returned malformed capture data');
      }
      results.push(parsed.data);
    }
    const captures = results.filter(
      (result): result is Extract<CapturePageResult, { status: 'captured' }> =>
        result.status === 'captured',
    );
    if (captures.length > 1) {
      throw new CaptureError('MULTIPLE_SELECTIONS', 'More than one frame reported a selection');
    }
    const [capture] = captures;
    if (capture !== undefined) return capture.value;
    if (results.some((result) => result.status === 'invalid-selection')) {
      throw new CaptureError('INVALID_CAPTURE', 'The selection exceeds TraceMark capture limits');
    }
    if (results.every((result) => result.status === 'unsupported')) {
      throw new CaptureError('UNSUPPORTED_PAGE', 'This browser page cannot be captured');
    }
    throw new CaptureError('NO_SELECTION', 'Select text on the page before saving');
  }
}

export interface CaptureActions<T> {
  saveTabSelection(tabId: number, frameId?: number): Promise<T>;
}

export function createCaptureActions<T>(
  capture: Pick<CaptureService, 'captureTab'>,
  highlights: { create(input: CreateHighlightInput): Promise<T> },
): CaptureActions<T> {
  return {
    async saveTabSelection(tabId, frameId) {
      const result = await capture.captureTab(tabId, frameId);
      return highlights.create({
        ...result,
        collectionId: INBOX_COLLECTION_ID,
        tags: [],
        note: '',
      });
    },
  };
}
