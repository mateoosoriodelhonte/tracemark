import type { AIProviderErrorCode } from '../domain/models';

export interface ResearchItem {
  id: string;
  quote: string;
  title: string;
  url: string;
  tags: string[];
  note: string;
}

export interface ResearchInput {
  items: ResearchItem[];
}

export interface TextAssistance {
  content: string;
}

export interface TagAssistance {
  tags: string[];
}

export interface AIProvider {
  summarize(input: ResearchInput, model: string): Promise<TextAssistance>;
  explain(input: ResearchInput, model: string): Promise<TextAssistance>;
  suggestTags(input: ResearchInput, model: string): Promise<TagAssistance>;
  overview(input: ResearchInput, model: string): Promise<TextAssistance>;
}

export class AIProviderError extends Error {
  constructor(
    public readonly code: AIProviderErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class NoAIProvider implements AIProvider {
  summarize(input: ResearchInput, model: string): Promise<TextAssistance> {
    void input;
    void model;
    return Promise.reject(new AIProviderError('AI_DISABLED', 'Local AI is disabled'));
  }

  explain(input: ResearchInput, model: string): Promise<TextAssistance> {
    void input;
    void model;
    return Promise.reject(new AIProviderError('AI_DISABLED', 'Local AI is disabled'));
  }

  suggestTags(input: ResearchInput, model: string): Promise<TagAssistance> {
    void input;
    void model;
    return Promise.reject(new AIProviderError('AI_DISABLED', 'Local AI is disabled'));
  }

  overview(input: ResearchInput, model: string): Promise<TextAssistance> {
    void input;
    void model;
    return Promise.reject(new AIProviderError('AI_DISABLED', 'Local AI is disabled'));
  }
}
