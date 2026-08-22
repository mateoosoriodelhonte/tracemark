import type { z } from 'zod';
import type { Highlight } from '../domain/models';
import {
  AnchorReadyResultSchema,
  AnchorRuntimeResultSchema,
  TextQuoteSelectorSchema,
} from '../domain/schemas';
import { safeSourceUrl } from '../domain/urls';

export type AnchorErrorCode =
  'NO_ACTIVE_TAB' | 'WRONG_PAGE' | 'UNSUPPORTED_PAGE' | 'INVALID_ANCHOR_RESULT';

export class AnchorError extends Error {
  constructor(
    readonly code: AnchorErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AnchorError';
  }
}

interface AnchorScriptInjection {
  target: { tabId: number };
  files: string[];
}

interface AnchorInjectionResult {
  frameId: number;
  result?: unknown;
}

type AnchorCommand = {
  type: 'tracemark.anchor.apply';
  selector: z.infer<typeof TextQuoteSelectorSchema>;
};

export interface AnchorServiceDependencies {
  queryActiveTabs(): Promise<Array<{ id?: number; url?: string }>>;
  executeScript(details: AnchorScriptInjection): Promise<AnchorInjectionResult[]>;
  sendMessage(
    tabId: number,
    message: AnchorCommand,
    options: { frameId: number },
  ): Promise<unknown>;
}

export class AnchorService {
  constructor(private readonly dependencies: AnchorServiceDependencies) {}

  async apply(highlight: Highlight): Promise<z.infer<typeof AnchorRuntimeResultSchema>> {
    const [tab] = await this.dependencies.queryActiveTabs();
    if (tab?.id === undefined) {
      throw new AnchorError('NO_ACTIVE_TAB', 'No active browser tab is available');
    }
    const activeUrl = tab.url === undefined ? undefined : safeSourceUrl(tab.url);
    if (activeUrl === undefined) {
      throw new AnchorError('UNSUPPORTED_PAGE', 'This browser page cannot be highlighted');
    }
    if (activeUrl !== highlight.url && activeUrl !== highlight.canonicalUrl) {
      throw new AnchorError('WRONG_PAGE', 'Open the saved source page before highlighting');
    }

    let injectionResults: AnchorInjectionResult[];
    try {
      injectionResults = await this.dependencies.executeScript({
        target: { tabId: tab.id },
        files: ['/content-scripts/anchor.js'],
      });
    } catch (error) {
      throw new AnchorError('UNSUPPORTED_PAGE', 'This browser page cannot be highlighted', {
        cause: error,
      });
    }
    const ready = AnchorReadyResultSchema.safeParse(injectionResults[0]?.result);
    if (!ready.success) {
      throw new AnchorError('INVALID_ANCHOR_RESULT', 'The page did not initialize anchoring');
    }

    let rawResult: unknown;
    try {
      rawResult = await this.dependencies.sendMessage(
        tab.id,
        {
          type: 'tracemark.anchor.apply',
          selector: {
            exact: highlight.quote,
            prefix: highlight.prefix,
            suffix: highlight.suffix,
          },
        },
        { frameId: 0 },
      );
    } catch (error) {
      throw new AnchorError('UNSUPPORTED_PAGE', 'This browser page cannot be highlighted', {
        cause: error,
      });
    }
    const result = AnchorRuntimeResultSchema.safeParse(rawResult);
    if (!result.success) {
      throw new AnchorError('INVALID_ANCHOR_RESULT', 'The page returned an invalid anchor result');
    }
    return result.data;
  }
}
