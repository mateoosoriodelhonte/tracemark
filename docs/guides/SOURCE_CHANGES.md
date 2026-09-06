# Handle changed source pages

TraceMark saves an exact quotation and nearby context, not a cached copy of the webpage. Publishers
can edit, move, remove, personalize, or restrict the source after capture.

## Interpret anchoring results

- A successful mark means one exact, context-supported occurrence exists on the current page.
- **Not found** means the normalized exact quotation is absent from the page content TraceMark can
  inspect.
- **Ambiguous** means the quotation occurs more than once without enough saved context to choose one
  safely.
- An unsupported or access error can mean the active tab is wrong, a fresh tab needs a qualifying
  gesture, or the browser prohibits injection on that page.

These results do not determine why the page changed or whether the source is trustworthy. A mark is
a temporary runtime annotation and disappears on reload.

## Reconcile a changed source

Open the stored source and compare the visible publication, date, heading, and surrounding text.
Check for a canonical article, print view, official revision notice, or stable primary source. If the
meaningful passage was revised, capture the current wording as a new quotation and explain the
relationship in **My note** rather than rewriting the original saved quotation.

Keep the older record when the historical wording matters. Otherwise, preserve anything needed in a
backup or export before deleting it. TraceMark does not maintain webpage versions or prove that an
older quotation was once published at the stored URL.

## Reduce future uncertainty

Record author, publication date, section, edition, access date, and stable identifier in the note
when those details matter. Prefer primary or versioned sources, and retain a separate lawful archive
or citation record when long-term page availability is required.

See [CITATION_WORKFLOW.md](CITATION_WORKFLOW.md) and the exact
[anchoring behavior](../reference/ANCHORING_BEHAVIOR.md).
