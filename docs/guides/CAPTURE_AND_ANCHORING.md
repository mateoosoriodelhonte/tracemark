# Capture and anchor quotations

TraceMark captures selected text together with its source details so a saved quotation can be revisited and, when it is safe, marked on the original page. It does not continuously read websites: page access happens only after a qualifying browser gesture on the active tab.

## Capture a quotation

Prerequisites: open a normal webpage, make its tab active, and select the exact text to save.

1. Click the TraceMark toolbar action.
2. Review the quotation and source in the capture view. Optionally set a collection, tags, and note.
3. Choose **Save quotation**.

Alternatively, use **Save selection to TraceMark** from the selection context menu, or press `Alt+Shift+S`, to save directly to **Inbox**. The direct paths do not provide the review step.

Expected result: the quotation appears in **Research library** with its page title and source host. TraceMark also retains limited nearby text context to make later anchoring more reliable.

If the extension says to select text, make a new selection and try again. Some pages cannot be captured: browser-internal pages, browser stores, and browser-owned PDF viewers commonly block injection. TraceMark does not request broader standing website access to work around those restrictions.

## Mark a saved quotation on the source page

Prerequisites: find the saved card in **Research library**, open its source with **Open source** (or navigate to the same saved source URL), and keep that page active.

1. On the saved quotation card, choose **Mark on page**.
2. TraceMark looks for the exact quotation and its surrounding context, then adds a runtime highlight if the match is unambiguous.

Expected result: the status says **Marked the saved quotation on this page.** The webpage text is not changed, and the annotation disappears when the page reloads.

TraceMark deliberately refuses to guess. If the status says the quotation appears more than once, multiple matches did not have enough context to choose safely. If it says the source changed, the exact quotation is no longer available to mark safely. In either case, return to the library, verify the saved quote and source, or capture a current passage as a new record.

## Recover access on a fresh tab

An active source page can still lack the temporary browser permission needed for anchoring, especially when it was opened fresh. Invoke the TraceMark toolbar action or press `Alt+Shift+S` on that specific active tab, close the capture view if needed, then retry **Mark on page**. This gesture grants access only for that tab interaction; it does not give TraceMark permanent access to sites.

If the browser still identifies the page as protected, it cannot be highlighted. Keep the saved source information as the durable link, rather than relying on a page mark.
