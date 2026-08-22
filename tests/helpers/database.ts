import Dexie, { type Table } from 'dexie';

export interface LegacyHighlightFixture {
  id: string;
  text: string;
  sourceUrl: string;
  title?: string;
  createdAt?: string;
  collectionId?: string;
  tags?: string[];
  note?: string;
}

class LegacyDatabase extends Dexie {
  highlights!: Table<LegacyHighlightFixture, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      highlights: '&id, createdAt',
      collections: '&id, name',
    });
  }
}

export async function createLegacyDatabase(
  name: string,
  highlights: LegacyHighlightFixture[],
): Promise<void> {
  const database = new LegacyDatabase(name);
  await database.open();
  await database.highlights.bulkAdd(highlights);
  database.close();
}

export async function readLegacyHighlights(name: string): Promise<LegacyHighlightFixture[]> {
  const database = new LegacyDatabase(name);
  await database.open();
  const highlights = await database.highlights.toArray();
  database.close();
  return highlights;
}

export function uniqueDatabaseName(): string {
  return `tracemark-test-${crypto.randomUUID()}`;
}
