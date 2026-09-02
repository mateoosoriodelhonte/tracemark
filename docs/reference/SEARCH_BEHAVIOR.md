# Search behavior

TraceMark searches a normalized local document built for every quotation. No search query or result
is sent to a server.

## Indexed fields

The searchable document combines quotation text, page title, source hostname, user note, tags, and
collection name. Text is normalized and tokenized when a record is created, edited, migrated, or
imported. Derived `searchText` and `searchTokens` fields are stored with the highlight.

## Matching

A query is normalized and split into tokens. Every query token must appear in the candidate's
normalized search-token set. A selected collection must match exactly, and a selected tag is
normalized before exact membership testing. Archived collections are excluded unless
**Include archived** is enabled.

Search is token-based rather than fuzzy or semantic. It does not correct spelling, expand synonyms,
stem words, search the live webpage, or ask Local AI. Phrase-like matches influence ranking but do
not change the requirement that every query token be present.

## Ranking and limits

Results receive additional weight when the full normalized query appears in the quotation, title,
note, tags, or combined search document. Quotation matches rank highest, followed by title, note,
tags, and the broader document. Ties prefer more recently created records.

The service returns 100 results by default and bounds requested limits between 1 and 500. The
library's result counter reflects the currently returned and filtered records, not a remote index.

## Troubleshooting retrieval

Use **Clear filters** before concluding a record is missing. Try distinctive individual words,
enable archived collections, and check tag spelling. If imported or migrated data cannot be found,
verify the operation completed because those paths rebuild derived search fields.

See [../guides/LIBRARY_AND_SEARCH.md](../guides/LIBRARY_AND_SEARCH.md) for the UI workflow.
