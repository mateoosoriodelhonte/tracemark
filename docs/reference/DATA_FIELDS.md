# Data fields reference

This overview describes TraceMark's stored domain records. The strict executable contract lives in
`src/domain/schemas.ts`; backup consumers should also read [../BACKUP_FORMAT.md](../BACKUP_FORMAT.md).

## Highlight

A highlight contains a UUID `id`, `schemaVersion`, exact `quote`, nearby `prefix` and `suffix`, page
`title`, normalized source `url`, `hostname`, `collectionId`, `tags`, `note`, derived `searchText`
and `searchTokens`, and creation/update timestamps. Optional fields are `heading`, broader `context`,
and `canonicalUrl`.

Current bounds include 20,000 quotation characters, 1,000 title characters, 10,000 characters for
each context or note field, 20 tags of at most 40 characters each, and normalized HTTP(S) source
URLs.

## Collection

A collection contains a UUID `id`, `schemaVersion`, display `name`, `normalizedName`, `status`
(`active` or `archived`), and creation/update timestamps. The canonical Inbox uses the fixed ID
`00000000-0000-4000-8000-000000000001`, active status, and normalized name `inbox`.

## AI result

An AI result contains a UUID `id`, `schemaVersion`, `kind` (`summary`, `explanation`, `tags`, or
`overview`), provider `ollama`, one or more `sourceHighlightIds`, structured `content`, optional
normalized `suggestedTags`, and `createdAt`. A result can refer to at most 500 highlights.

## Settings

Settings use the literal ID `settings`, `schemaVersion`, theme (`system`, `light`, or `dark`), and an
`ai` object containing provider (`none` or `ollama`) and model name. Browser permissions are not
settings fields.

All timestamps are ISO date-time strings with an offset. Strict schemas reject unrecognized record
fields. Imports normalize or rebuild selected values rather than trusting every exported derivative.
