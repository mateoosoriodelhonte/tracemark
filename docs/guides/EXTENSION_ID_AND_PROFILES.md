# Extension identity and browser profiles

TraceMark data belongs to a browser profile and extension identity. Two installations can display
the same name and version while using separate IndexedDB and browser-local settings.

## Why a library can appear empty

Opening another Chrome or Firefox profile creates a separate extension-storage boundary. A private
or guest window can have different extension availability. Loading a second unpacked Chrome copy
from another directory may also create a different extension identity when no fixed manifest key is
present. That copy cannot see the first installation's local library.

Firefox packages declare `tracemark@mateoosoriodelhonte.github.io` as their extension ID, but each
Firefox profile still has separate storage. A temporary add-on is removed from the browser when
Firefox restarts, so installation continuity and data continuity should not be assumed without a
verified backup.

## Check before changing an installation

1. Open the current research library and confirm a known quotation is present.
2. Download a JSON backup and keep the original file unchanged.
3. Record the browser profile, TraceMark version, installation route, and extension ID shown by the
   browser's extension-management page.
4. Install or reload the new package without deleting the source profile or old package directory.
5. Confirm the expected library appears. If it does not, stop and compare profile and extension-ID
   details before importing.

## Move data intentionally

Use **Validate and merge backup** to move research between known storage boundaries. After import,
clear filters and verify sample quotations, collections, tags, notes, source links, and saved AI
results. Browser permissions are not included in the backup and must be granted separately.

Do not repeatedly import into unidentified installations while troubleshooting; first determine
which profile contains the authoritative library. Follow [MIGRATING_PROFILES.md](MIGRATING_PROFILES.md)
for the complete transfer workflow and [INSTALLATION_AND_UPDATES.md](INSTALLATION_AND_UPDATES.md) for
package replacement guidance.
