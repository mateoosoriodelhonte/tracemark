# Delete local TraceMark data

TraceMark stores research in the current browser profile. Deletion affects that local library; it
does not remove copies already exported, shared, backed up, or sent to a separately running Ollama
service.

## Delete one saved quotation

Open the research library, find the quotation, and choose **Edit**. Choose **Delete quotation**, then
confirm **Delete this quotation permanently?** TraceMark removes the highlight and any saved Local AI
results that refer to it in the same local database transaction.

This operation has no in-app undo. Download a JSON backup first if the quotation or its AI results
might be needed later.

## Remove a collection

Open **Manage collections**, choose a non-Inbox collection, and choose **Delete collection**. The
confirmation is **Move items to Inbox and delete**: TraceMark moves that collection's quotations to
Inbox before removing the organizational container. It does not delete those quotations.

Inbox cannot be renamed, archived, or deleted. Archive a collection instead when you want to hide
completed work from ordinary results while retaining its organization.

## Remove Local AI access

Choose **Disable local AI** to save the disabled preference and request removal of applicable browser
permissions. If TraceMark cannot confirm cleanup, use **Retry permission removal** and inspect the
extension permissions in the browser. Disabling does not delete existing saved AI results; delete
their source quotations if those dependent records should also be removed.

## Remove the complete local library

TraceMark does not currently provide a bulk erase button. Browser extension-management controls can
remove an extension and its local data, while browser/profile cleanup can also make that data
unavailable. Exact behavior is browser-controlled, so export any research you intend to keep and
verify the backup before using those controls.

Delete exported JSON or Markdown files separately from every device, backup system, or sharing
destination where they were copied. See [DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md) for all storage
boundaries and [BACKUP_AND_RESTORE.md](BACKUP_AND_RESTORE.md) before destructive profile changes.
