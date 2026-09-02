# Anchoring behavior

Anchoring marks one saved quotation on its source page without modifying the stored quote or
website content.

## Source check

The background service queries the active tab and normalizes its URL. The active URL must equal the
saved source URL or optional canonical URL. A missing tab, protected URL, wrong page, injection
failure, or invalid content-script response stops the operation with a specific error path.

On a fresh tab that lacks access, the recovery message asks the user to invoke the toolbar action or
`Alt+Shift+S` on that tab and retry. This preserves the temporary `activeTab` permission model.

## Match selection

The page script normalizes page whitespace and the saved exact quotation. With no exact match it
returns `not-found`; with one match it returns that range. When the exact quote appears multiple
times, each candidate is scored by how much text immediately before and after it matches the saved
prefix and suffix.

The top candidate must have nonzero context support and beat the runner-up by at least four matched
context characters. Otherwise the result is `ambiguous`. TraceMark refuses to guess rather than
marking a plausible but unsupported occurrence.

## Result and lifetime

Successful anchoring returns `marked` with a bounded mark count. Other valid results are
`ambiguous`, `not-found`, and `unsupported`. The library translates them into user guidance.

The visual mark is a runtime annotation in the current page. It disappears on reload, is not saved
back into the website, and does not create a cached copy of the page. A mark confirms an exact
current text match, not the truth, authorship, or stability of the source.

See [../guides/CAPTURE_AND_ANCHORING.md](../guides/CAPTURE_AND_ANCHORING.md) for user steps and
[USER_GESTURES.md](USER_GESTURES.md) for page-access rules.
