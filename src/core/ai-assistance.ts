import { AIProviderError, type AIProvider, type ResearchItem } from './ai-provider';
import type { AIAssistanceErrorCode, AIResult, AIResultKind, Settings } from '../domain/models';
import { AIResultSchema, IdSchema } from '../domain/schemas';
import type { ResearchRepository } from '../storage/repository';

export const OLLAMA_PERMISSION_ORIGIN = 'http://127.0.0.1:11434/*';

interface Preferences {
  get(): Promise<Settings>;
}

interface PermissionChecker {
  contains(permissions: { origins: string[] }): Promise<boolean>;
}

interface AIAssistanceDependencies {
  now(): string;
  createId(): string;
}

interface ProviderOutput {
  content: string;
  suggestedTags?: string[];
}

export class AIAssistanceError extends Error {
  constructor(
    public readonly code: AIAssistanceErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AIAssistanceError';
  }
}

export class AIAssistanceService {
  constructor(
    private readonly repository: ResearchRepository,
    private readonly provider: AIProvider,
    private readonly preferences: Preferences,
    private readonly permissions: PermissionChecker,
    private readonly dependencies: AIAssistanceDependencies,
  ) {}

  async run(kind: AIResultKind, sourceHighlightIds: string[]): Promise<AIResult> {
    const settings = await this.preferences.get();
    if (settings.ai.provider !== 'ollama') {
      throw new AIAssistanceError('AI_DISABLED', 'Local AI is disabled');
    }
    if (!(await this.permissions.contains({ origins: [OLLAMA_PERMISSION_ORIGIN] }))) {
      throw new AIAssistanceError('AI_PERMISSION_REQUIRED', 'Local AI permission is required');
    }
    if (
      sourceHighlightIds.length < 1 ||
      sourceHighlightIds.length > 20 ||
      new Set(sourceHighlightIds).size !== sourceHighlightIds.length ||
      sourceHighlightIds.some((id) => !IdSchema.safeParse(id).success)
    ) {
      throw new AIAssistanceError('NOT_FOUND', 'Selected research was not found');
    }

    const items: ResearchItem[] = [];
    for (const id of sourceHighlightIds) {
      const highlight = await this.repository.getHighlight(id);
      if (highlight === undefined) {
        throw new AIAssistanceError('NOT_FOUND', 'Selected research was not found');
      }
      items.push({
        id: highlight.id,
        quote: highlight.quote,
        title: highlight.title,
        url: highlight.url,
        tags: highlight.tags,
        note: highlight.note,
      });
    }

    let output: ProviderOutput;
    try {
      output = await this.runProvider(kind, items, settings.ai.model);
    } catch (error) {
      if (error instanceof AIAssistanceError) throw error;
      if (error instanceof AIProviderError) {
        throw new AIAssistanceError(error.code, error.message, { cause: error });
      }
      throw error;
    }

    const result = AIResultSchema.parse({
      id: this.dependencies.createId(),
      schemaVersion: 1,
      kind,
      provider: 'ollama',
      sourceHighlightIds,
      ...output,
      createdAt: this.dependencies.now(),
    });
    return this.repository.putAIResult(result);
  }

  private async runProvider(
    kind: AIResultKind,
    items: ResearchItem[],
    model: string,
  ): Promise<ProviderOutput> {
    const input = { items };
    switch (kind) {
      case 'summary':
        return this.provider.summarize(input, model);
      case 'explanation':
        return this.provider.explain(input, model);
      case 'tags': {
        const { tags } = await this.provider.suggestTags(input, model);
        return { content: tags.join(', '), suggestedTags: tags };
      }
      case 'overview':
        return this.provider.overview(input, model);
    }
  }
}
