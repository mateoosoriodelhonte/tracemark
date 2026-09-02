# Troubleshooting TraceMark

This guide covers the common cases where a browser limitation, local storage condition, or optional Ollama setup prevents a TraceMark action. TraceMark is local-first and uses temporary, gesture-based webpage access rather than standing access to all sites.

## I cannot save a selection

Prerequisites for capture are a selected piece of text, an active normal webpage tab, and a browser gesture such as the TraceMark toolbar action, **Save selection to TraceMark**, or `Alt+Shift+S`.

- If TraceMark asks you to select text, make a new selection and retry.
- If it reports that the page cannot be captured, move to a regular web page. Browser-internal pages, browser stores, and browser-owned PDF viewers can reject extension injection.
- If the selection is unusually large or spans content that cannot be captured consistently, select a smaller, ordinary text passage and retry.

Expected result: the quotation is saved, typically to the capture view you confirm with **Save quotation**, or directly to Inbox through the context-menu and keyboard paths.

## Mark on page does not work

First make sure the active tab is the saved source page. If you opened a fresh tab, invoke the TraceMark toolbar action or press `Alt+Shift+S` on that tab, then retry **Mark on page**. Opening the library does not grant active-tab access to a page.

TraceMark refuses unsafe anchors. A message that the quotation appears more than once means it cannot distinguish identical matches; a changed-source message means the exact text is absent. The page mark is only a runtime annotation and disappears after a reload. Protected pages can remain unavailable even after a gesture.

## I cannot find saved research

Choose **Clear filters**, then use **Search research** with a distinctive word from the quotation, note, tag, title, source host, or collection name and choose **Search**. Enable **Include archived** if the record may be in an archived collection. If the library reports an error loading local research, choose **Try again**.

If browser or extension data was cleared, the browser profile was removed, or the extension was uninstalled, local records may no longer be available. Restore a downloaded JSON backup through **Backups** → **Choose TraceMark JSON backup** → **Validate and merge backup**. Markdown downloads are readable exports and cannot be restored.

## A backup will not import

TraceMark accepts only valid TraceMark JSON backups smaller than 20 MB. Ensure that you selected the JSON file rather than a Markdown export and that the file was not manually altered. The import validates the full file before merging and leaves unrelated local research intact. Try an earlier backup if the selected one is invalid.

## Local AI cannot enable or respond

Confirm Ollama is installed, running locally, and has the model entered in **Ollama model**. Approve the permission for `127.0.0.1:11434`; Firefox requires its data-consent step followed by **Continue enabling local AI** and a second origin prompt. Select at least one and no more than 20 visible saved quotations before choosing an AI action.

If permission removal is pending, choose **Retry permission removal** before enabling again, or inspect the extension’s permissions in browser settings. If a request times out, the model is unavailable, or the service cannot be reached, resolve the Ollama issue and retry; TraceMark does not silently send research when it cannot confirm the required permissions.

For setup details, see [Use optional local AI with Ollama](LOCAL_AI.md).
