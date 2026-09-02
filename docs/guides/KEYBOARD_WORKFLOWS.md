# Keyboard workflows

TraceMark uses native form controls and provides a browser command for quick capture. Exact key
handling outside the extension UI is controlled by the browser and operating system.

## Save a selection

On a normal webpage, select text and press `Alt+Shift+S`. TraceMark captures the selection directly
to Inbox. This fast path does not open the review form for collection, tag, or note editing; add
those fields later from **Research library** → **Edit**.

If the shortcut does nothing, open the browser's extension-shortcut settings and check whether
another application or extension has claimed it. The toolbar action remains an alternative and
opens the reviewed capture flow. Protected browser pages may reject both capture paths.

## Navigate the popup and library

Use `Tab` and `Shift+Tab` to move among native links, buttons, inputs, selects, checkboxes, and
textareas. Press `Enter` to activate the focused button or submit a form; use `Space` for a focused
checkbox. Visible focus outlines identify the active control.

When an edit or management dialog opens, focus moves into the dialog. `Escape` closes supported
dialogs, and focus returns to the control that opened them. Destructive operations still require
their visible confirmation step.

## Grant temporary page access

Opening the library does not grant access to a source tab. On a fresh or revisited source page,
focus that tab and invoke the toolbar action or `Alt+Shift+S`, then retry **Mark on page**. The
gesture gives temporary access to that active page; it is not standing access to websites.

## Browser-owned surfaces

Chrome's side panel, Firefox's sidebar, extension toolbar menus, context menus, and permission
prompts are browser interfaces. Their focus order and shortcuts can differ from TraceMark's own
controls. Use the browser's accessibility and shortcut settings when those surfaces are the
barrier. See [ACCESSIBILITY.md](../ACCESSIBILITY.md) for tested evidence and limitations.
