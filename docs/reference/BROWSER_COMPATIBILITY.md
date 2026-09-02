# Browser compatibility matrix

TraceMark produces Manifest V3 packages for Chrome and Firefox from one source tree, with
browser-specific native library surfaces.

| Capability               | Chrome                                 | Firefox                                        |
| ------------------------ | -------------------------------------- | ---------------------------------------------- |
| Package target           | MV3                                    | MV3                                            |
| Research library         | Native side panel and extension page   | Native sidebar and extension page              |
| Temporary webpage access | `activeTab` after a qualifying gesture | `activeTab` after a qualifying gesture         |
| Static host permissions  | None                                   | None                                           |
| Static content scripts   | None                                   | None                                           |
| Optional Local AI origin | `http://127.0.0.1:11434/*`             | Same origin                                    |
| Local AI consent         | Optional origin prompt                 | Optional data-consent step, then origin prompt |
| Release installation     | Extract and load unpacked              | Unsigned temporary add-on                      |
| Declared minimum         | Demonstrated by current package tests  | Firefox 142 or newer                           |

## Evidence boundary

Automated tests verify generated manifests, package contents, extension startup, library behavior,
search, edits, inert rendering, imports, exports, and selected packaged flows. They do not prove the
browser-owned toolbar, context menu, command dispatch, permission doorhangers, Chrome side-panel
chrome, or Firefox sidebar chrome. Those require the manual checklists in
[../TESTING.md](../TESTING.md).

Chromium-based browsers may load the Chrome package, but the project does not claim support for
every derivative or version. Enterprise policies can disable unpacked extensions, side panels,
downloads, or optional permissions even when the browser engine is otherwise compatible.

## Common limitations

Both browsers can block runtime injection on internal pages, extension stores, and browser-owned
PDF viewers. A fresh or revisited source tab may require a new toolbar or command gesture before
anchoring. Temporary marks disappear on reload.

Firefox removes a temporary add-on on restart. Neither package is currently published in a browser
store. Distribution status is independent of source and package compatibility.

See [../PERMISSIONS.md](../PERMISSIONS.md) for the exact generated permission contract.
