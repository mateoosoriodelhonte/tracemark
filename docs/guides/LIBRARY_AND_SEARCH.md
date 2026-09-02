# Organize and search your research library

The **Research library** is where TraceMark stores, finds, and maintains saved quotations. Records remain in local browser-profile storage by default, so organization is a useful companion to regular JSON backups.

## Find saved research

Use the **Search research** field and choose **Search**. Search covers quotation text, page titles, source hosts, notes, tags, and collection names. You can start with a phrase or a distinctive word; TraceMark matches the normalized search terms stored with each quotation.

Refine results with the **Collection** and **Tag** dropdowns. Archived collections are excluded unless you select **Include archived**. The counter above the cards reports the visible saved-quotation count. Choose **Clear filters** to reset the search text and every filter.

Expected result: cards show matching quotations with their source host, save date, tags, collection, and note. If no card appears, try fewer or broader terms, then clear filters to rule out a narrow collection or tag selection.

## Edit or delete a quotation

Choose **Edit** on a quotation card. In **Edit saved quotation**, you can select an active **Collection**, add comma-separated **Tags**, and write **My note**. Choose **Save changes** when finished.

To permanently remove one record, choose **Delete quotation**, then **Confirm deletion**. This affects the local library immediately. If you may want the record later, download a JSON backup before deleting it.

Each card also offers **Open source** and **Mark on page**. Opening the source does not itself create a persistent page annotation; see [Capture and anchoring](CAPTURE_AND_ANCHORING.md) for the exact-match and active-tab requirements.

## Manage collections

Choose **Manage collections** and enter a **New collection name**, then select **Create collection**. Select an existing collection in the manager to rename it with **Save name**, archive it, restore it, or delete it.

**Inbox** is TraceMark’s safe default. It cannot be renamed or deleted. Deleting another collection does not delete its quotations: confirm **Move items to Inbox and delete** to keep them in Inbox. Archiving is a reversible way to hide a collection from ordinary browsing; use **Include archived** in the library to view it again, then choose **Restore collection** in collection management when ready.

## Useful recovery checks

If an edit does not seem visible, run **Search** and check the current filters. If a collection no longer appears in ordinary results, it may be archived rather than missing. If the library cannot load local research, use **Try again**; if browser data was cleared or the extension was removed, restore a previously downloaded JSON backup as described in [Backup and restore](BACKUP_AND_RESTORE.md).
