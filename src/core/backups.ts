import type { z } from 'zod';
import { INBOX_COLLECTION_ID } from '../domain/constants';
import type { AIResult, Collection, Highlight, Settings } from '../domain/models';
import { buildSearchDocument } from '../domain/search-document';
import {
  AIResultSchema,
  BackupEnvelopeSchema,
  BackupExportSchema,
  BackupImportResultSchema,
  CollectionSchema,
  HighlightSchema,
} from '../domain/schemas';
import { normalizeTags } from '../domain/tags';
import { normalizeSearchText, normalizeWhitespace } from '../domain/text';
import { safeCanonicalUrl, safeSourceUrl } from '../domain/urls';
import type { ResearchRepository } from '../storage/repository';

const MAX_BACKUP_LENGTH = 20_000_000;

interface BackupPreferences {
  get(): Promise<Settings>;
}

interface BackupDependencies {
  now(): string;
  createId(): string;
}

export class BackupError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupError';
  }
}

function dateStamp(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function markdownText(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/[\\`*_[\]{}()#+.!|-]/gu, '\\$&');
}

function quoteBlock(value: string): string {
  return markdownText(value)
    .split(/\r?\n/u)
    .map((line) => `> ${line}`)
    .join('\n');
}

function markdownUrl(value: string): string {
  return value.replace(/\\/gu, '%5C').replace(/\(/gu, '%28').replace(/\)/gu, '%29');
}

function savedDate(timestamp: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(timestamp));
}

function slug(value: string): string {
  return normalizeSearchText(value).replace(/\s+/gu, '-').slice(0, 80) || 'collection';
}

function uniqueValues(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

type EntityCounts = z.infer<typeof BackupImportResultSchema>['created'];

function emptyCounts(): EntityCounts {
  return { collections: 0, highlights: 0, aiResults: 0 };
}

function sameRecord(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isNewer(importedTimestamp: string, localTimestamp: string): boolean {
  return Date.parse(importedTimestamp) > Date.parse(localTimestamp);
}

function normalizeCollection(collection: Collection): Collection {
  const name = normalizeWhitespace(collection.name);
  return CollectionSchema.parse({
    ...collection,
    name,
    normalizedName: normalizeSearchText(name),
  });
}

function normalizeHighlight(
  highlight: Highlight,
  collectionId: string,
  collectionName: string,
): Highlight {
  const url = safeSourceUrl(highlight.url);
  if (url === undefined) throw new BackupError('A highlight has an invalid source URL');
  const title = normalizeWhitespace(highlight.title);
  const tags = normalizeTags(highlight.tags);
  const hostname = new URL(url).hostname;
  const canonicalUrl =
    highlight.canonicalUrl === undefined
      ? undefined
      : safeCanonicalUrl(highlight.canonicalUrl, url);
  const search = buildSearchDocument(
    { quote: highlight.quote, title, hostname, note: highlight.note, tags },
    collectionName,
  );
  const normalized: Highlight = {
    ...highlight,
    title,
    url,
    hostname,
    collectionId,
    tags,
    ...search,
  };
  if (canonicalUrl === undefined) delete normalized.canonicalUrl;
  else normalized.canonicalUrl = canonicalUrl;
  return HighlightSchema.parse(normalized);
}

function highlightIdentity(highlight: Pick<Highlight, 'url' | 'quote'>): string {
  return `${highlight.url}\u0000${highlight.quote}`;
}

function aiIdentity(result: AIResult): string {
  return JSON.stringify([
    result.kind,
    result.provider,
    result.sourceHighlightIds,
    result.content,
    result.suggestedTags ?? null,
  ]);
}

export class BackupService {
  constructor(
    private readonly repository: ResearchRepository,
    private readonly preferences: BackupPreferences,
    private readonly dependencies: BackupDependencies,
  ) {}

  async exportJson(): Promise<z.infer<typeof BackupExportSchema>> {
    const exportedAt = this.dependencies.now();
    const [collections, highlights, aiResults] = await this.repository.database.transaction(
      'r',
      this.repository.database.collections,
      this.repository.database.highlights,
      this.repository.database.aiResults,
      async () =>
        Promise.all([
          this.repository.listCollections(),
          this.repository.listHighlights(),
          this.repository.database.aiResults.orderBy('createdAt').toArray(),
        ]),
    );
    const settings = await this.preferences.get();
    const envelope = BackupEnvelopeSchema.parse({
      format: 'tracemark-backup',
      version: 1,
      exportedAt,
      collections,
      highlights,
      aiResults,
      settings,
    });

    return BackupExportSchema.parse({
      format: 'json',
      filename: `tracemark-backup-${dateStamp(exportedAt)}.json`,
      content: JSON.stringify(envelope, undefined, 2),
    });
  }

  async exportMarkdown(collectionId?: string): Promise<z.infer<typeof BackupExportSchema>> {
    const exportedAt = this.dependencies.now();
    const collections = await this.repository.listCollections();
    const collection =
      collectionId === undefined
        ? undefined
        : collections.find((candidate) => candidate.id === collectionId);
    if (collectionId !== undefined && collection === undefined) {
      throw new BackupError('Collection not found');
    }
    const highlights = (await this.repository.listHighlights()).filter(
      (highlight) => collectionId === undefined || highlight.collectionId === collectionId,
    );
    const collectionNames = new Map(collections.map((candidate) => [candidate.id, candidate.name]));
    const heading = collection?.name ?? 'All research';
    const sections = highlights.map((highlight) => {
      const tags =
        highlight.tags.length === 0
          ? 'None'
          : highlight.tags.map((tag) => markdownText(tag)).join(', ');
      const note = highlight.note.length === 0 ? 'None' : markdownText(highlight.note);
      return [
        `## ${markdownText(highlight.title)}`,
        '',
        quoteBlock(highlight.quote),
        '',
        `Source: [${markdownText(highlight.title)}](${markdownUrl(highlight.url)})`,
        `Saved: ${savedDate(highlight.createdAt)}`,
        `Collection: ${markdownText(collectionNames.get(highlight.collectionId) ?? 'Unknown')}`,
        `Tags: ${tags}`,
        '',
        'My note:',
        note,
      ].join('\n');
    });
    const content = [
      `# TraceMark — ${markdownText(heading)}`,
      '',
      ...sections.flatMap((item) => [item, '']),
    ]
      .join('\n')
      .trimEnd()
      .concat('\n');

    return BackupExportSchema.parse({
      format: 'markdown',
      filename: `tracemark-${slug(heading)}-${dateStamp(exportedAt)}.md`,
      content,
    });
  }

  async importJson(
    content: string,
    confirmed: boolean,
  ): Promise<z.infer<typeof BackupImportResultSchema>> {
    if (!confirmed) throw new BackupError('Backup replacement requires explicit confirmation');
    if (content.length > MAX_BACKUP_LENGTH) throw new BackupError('The backup is too large');

    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch (error) {
      throw new BackupError('The backup JSON is invalid', { cause: error });
    }
    const parsed = BackupEnvelopeSchema.safeParse(raw);
    if (!parsed.success) throw new BackupError('The backup data is invalid');
    const backup = parsed.data;

    const collectionIds = backup.collections.map(({ id }) => id);
    if (!uniqueValues(collectionIds)) throw new BackupError('The backup has duplicate collections');
    const importedInbox = backup.collections.find(({ id }) => id === INBOX_COLLECTION_ID);
    if (
      importedInbox === undefined ||
      importedInbox.name !== 'Inbox' ||
      importedInbox.normalizedName !== 'inbox' ||
      importedInbox.status !== 'active'
    ) {
      throw new BackupError('The backup does not contain the canonical active Inbox');
    }

    const normalizedCollections = backup.collections.map((collection) =>
      normalizeCollection(collection),
    );
    if (!uniqueValues(normalizedCollections.map(({ normalizedName }) => normalizedName))) {
      throw new BackupError('The backup has duplicate collection names');
    }
    const collectionIdSet = new Set(collectionIds);
    if (backup.highlights.some(({ collectionId }) => !collectionIdSet.has(collectionId))) {
      throw new BackupError('A highlight references an unknown collection');
    }
    if (!uniqueValues(backup.highlights.map(({ id }) => id))) {
      throw new BackupError('The backup has duplicate highlights');
    }
    if (!uniqueValues(backup.aiResults.map(({ id }) => id))) {
      throw new BackupError('The backup has duplicate AI results');
    }
    const highlightIds = new Set(backup.highlights.map(({ id }) => id));
    if (
      backup.aiResults.some(({ sourceHighlightIds }) =>
        sourceHighlightIds.some((id) => !highlightIds.has(id)),
      )
    ) {
      throw new BackupError('An AI result references an unknown highlight');
    }

    const created = emptyCounts();
    const updated = emptyCounts();
    const skipped = emptyCounts();
    const regenerated = emptyCounts();
    const rejected = emptyCounts();

    try {
      await this.repository.database.transaction(
        'rw',
        this.repository.database.collections,
        this.repository.database.highlights,
        this.repository.database.aiResults,
        async () => {
          const existingCollections = await this.repository.listCollections();
          const collectionsById = new Map(existingCollections.map((item) => [item.id, item]));
          const collectionsByName = new Map(
            existingCollections.map((item) => [item.normalizedName, item]),
          );
          const resolvedCollectionIds = new Map<string, string>();
          const usedCollectionIds = new Set(collectionsById.keys());

          for (const imported of normalizedCollections) {
            const sameId = collectionsById.get(imported.id);
            const sameName = collectionsByName.get(imported.normalizedName);
            if (sameId !== undefined && sameId.normalizedName === imported.normalizedName) {
              resolvedCollectionIds.set(imported.id, sameId.id);
              if (sameRecord(sameId, imported) || !isNewer(imported.updatedAt, sameId.updatedAt)) {
                skipped.collections += 1;
              } else {
                await this.repository.database.collections.put(imported);
                collectionsById.set(imported.id, imported);
                collectionsByName.delete(sameId.normalizedName);
                collectionsByName.set(imported.normalizedName, imported);
                updated.collections += 1;
              }
              continue;
            }
            if (sameName !== undefined) {
              resolvedCollectionIds.set(imported.id, sameName.id);
              skipped.collections += 1;
              continue;
            }

            let resolved = imported;
            if (sameId !== undefined) {
              const id = this.uniqueId(usedCollectionIds);
              resolved = CollectionSchema.parse({ ...imported, id });
              regenerated.collections += 1;
            }
            await this.repository.database.collections.add(resolved);
            usedCollectionIds.add(resolved.id);
            collectionsById.set(resolved.id, resolved);
            collectionsByName.set(resolved.normalizedName, resolved);
            resolvedCollectionIds.set(imported.id, resolved.id);
            created.collections += 1;
          }

          const existingHighlights = await this.repository.listHighlights();
          const highlightsById = new Map(existingHighlights.map((item) => [item.id, item]));
          const highlightsByIdentity = new Map(
            existingHighlights.map((item) => [highlightIdentity(item), item]),
          );
          const resolvedHighlightIds = new Map<string, string>();
          const usedHighlightIds = new Set(highlightsById.keys());

          for (const rawHighlight of backup.highlights) {
            const collectionId = resolvedCollectionIds.get(rawHighlight.collectionId);
            const collection =
              collectionId === undefined ? undefined : collectionsById.get(collectionId);
            if (collection === undefined) {
              throw new BackupError('A highlight references an unresolved collection');
            }
            let imported = normalizeHighlight(rawHighlight, collection.id, collection.name);
            const semanticMatch = highlightsByIdentity.get(highlightIdentity(imported));
            const sameId = highlightsById.get(imported.id);
            if (semanticMatch !== undefined) {
              resolvedHighlightIds.set(rawHighlight.id, semanticMatch.id);
              if (
                semanticMatch.id === imported.id &&
                !sameRecord(semanticMatch, imported) &&
                isNewer(imported.updatedAt, semanticMatch.updatedAt)
              ) {
                await this.repository.database.highlights.put(imported);
                highlightsById.set(imported.id, imported);
                highlightsByIdentity.set(highlightIdentity(imported), imported);
                updated.highlights += 1;
              } else skipped.highlights += 1;
              continue;
            }
            if (sameId !== undefined) {
              const id = this.uniqueId(usedHighlightIds);
              imported = HighlightSchema.parse({ ...imported, id });
              regenerated.highlights += 1;
            }
            await this.repository.database.highlights.add(imported);
            usedHighlightIds.add(imported.id);
            highlightsById.set(imported.id, imported);
            highlightsByIdentity.set(highlightIdentity(imported), imported);
            resolvedHighlightIds.set(rawHighlight.id, imported.id);
            created.highlights += 1;
          }

          const existingAiResults = (await this.repository.database.aiResults.toArray()).map(
            (item) => AIResultSchema.parse(item),
          );
          const aiById = new Map(existingAiResults.map((item) => [item.id, item]));
          const aiByIdentity = new Map(existingAiResults.map((item) => [aiIdentity(item), item]));
          const usedAiIds = new Set(aiById.keys());

          for (const rawResult of backup.aiResults) {
            let imported = AIResultSchema.parse({
              ...rawResult,
              sourceHighlightIds: rawResult.sourceHighlightIds.map((id) => {
                const resolved = resolvedHighlightIds.get(id);
                if (resolved === undefined) {
                  throw new BackupError('An AI result references an unresolved highlight');
                }
                return resolved;
              }),
            });
            const semanticMatch = aiByIdentity.get(aiIdentity(imported));
            const sameId = aiById.get(imported.id);
            if (semanticMatch !== undefined) {
              if (semanticMatch.id === imported.id && !sameRecord(semanticMatch, imported)) {
                await this.repository.database.aiResults.put(imported);
                aiById.set(imported.id, imported);
                aiByIdentity.set(aiIdentity(imported), imported);
                updated.aiResults += 1;
              } else skipped.aiResults += 1;
              continue;
            }
            if (sameId !== undefined) {
              const id = this.uniqueId(usedAiIds);
              imported = AIResultSchema.parse({ ...imported, id });
              regenerated.aiResults += 1;
            }
            await this.repository.database.aiResults.add(imported);
            usedAiIds.add(imported.id);
            aiById.set(imported.id, imported);
            aiByIdentity.set(aiIdentity(imported), imported);
            created.aiResults += 1;
          }
        },
      );
    } catch (error) {
      if (error instanceof BackupError) throw error;
      throw new BackupError('TraceMark could not merge this backup', { cause: error });
    }

    return BackupImportResultSchema.parse({
      collections: backup.collections.length,
      highlights: backup.highlights.length,
      aiResults: backup.aiResults.length,
      created,
      updated,
      skipped,
      regenerated,
      rejected,
    });
  }

  private uniqueId(usedIds: Set<string>): string {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const id = this.dependencies.createId();
      if (!usedIds.has(id)) return id;
    }
    throw new BackupError('TraceMark could not allocate a unique imported record ID');
  }
}
