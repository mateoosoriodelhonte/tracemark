# TraceMark Permission Rationale

This document describes the permissions in the built TraceMark 1.0.0 manifests. The release
validator and manifest tests enforce the same contract.

## Built manifest contract

Shared required permissions:

```json
["activeTab", "scripting", "contextMenus", "storage"]
```

Chrome adds:

```json
["sidePanel"]
```

Both browsers declare exactly one optional origin:

```json
["http://127.0.0.1:11434/*"]
```

Neither build declares a static `host_permissions` value or `content_scripts` entry.

Firefox also declares required data collection `none` and optional built-in data consent for
`websiteContent` and `browsingActivity`. Those data types are not host permissions and are not
granted at installation.

## Why each permission exists

| Permission     | Browser            | Use and boundary                                                                                                                                                             |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`    | Chrome and Firefox | A qualifying toolbar, context-menu, or command gesture grants temporary access to the active page for capture or anchoring. It is not permanent access to browsing activity. |
| `scripting`    | Chrome and Firefox | Injects the packaged capture or anchor script at runtime after a user action. TraceMark does not inject a static script into every page.                                     |
| `contextMenus` | Chrome and Firefox | Adds **Save selection to TraceMark** to the selection context menu and handles that explicit action.                                                                         |
| `storage`      | Chrome and Firefox | Reads and writes theme and AI provider/model settings through `browser.storage.local`. Research data is stored separately in extension IndexedDB.                            |
| `sidePanel`    | Chrome only        | Registers the research library as Chrome's side panel. Firefox uses its generated `sidebar_action` manifest entry instead.                                                   |

## Optional Ollama origin

`http://127.0.0.1:11434/*` is not granted at installation. Chromium requests it when the user
chooses **Enable local AI**; Firefox requests it from the follow-up **Continue enabling local AI**
click after built-in data consent is granted. The browser controls each permission prompt. The
origin permits the background context to call the local Ollama chat API. TraceMark's implementation
sends selected stored research only for a requested AI action and does not use `localhost`, IPv6
loopback, another port, a LAN address, or `ollama.com`.

The URL uses HTTP, not HTTPS. Loopback traffic is not encrypted and the permission does not make the
Ollama process, models, browser, operating system, or other local software trustworthy. Users can
disable local AI and remove the origin permission through TraceMark; they can also inspect or revoke
it in browser extension settings.

On Firefox, enabling Local AI requires two explicit clicks. **Enable local AI** immediately requests
`data_collection: ["websiteContent", "browsingActivity"]` without a preflight permission
inspection. After approval, **Continue enabling local AI** immediately requests the exact Ollama
origin with a second user gesture. TraceMark requires the origin and both data types before every
Ollama request. If built-in data consent is unavailable, or any applicable grant is revoked,
transmission fails closed. Disabling Local AI separately removes the origin and both data types.
Chromium requests and checks only the optional origin from its single **Enable local AI** click.

Failed removal remains recoverable: the disabled library blocks **Enable local AI** and exposes
**Retry permission removal** until cleanup succeeds. On reload, TraceMark reconciles the disabled
preference with applicable browser grants and surfaces the same explicit cleanup control without
automatically removing a grant. If either applicable browser-permission inspection is unavailable
or fails, TraceMark treats the result as unknown, blocks **Enable local AI**, and requires an
explicit cleanup retry to establish and remove any residual grant before enabling can resume.

## Permissions TraceMark does not request

The built manifests do not contain:

- `<all_urls>` or any required website origin;
- static content scripts;
- `tabs`;
- browsing history;
- cookies;
- clipboard access;
- telemetry or analytics access;
- an account, TraceMark cloud sync, or application-backend permission; or
- any optional origin other than `http://127.0.0.1:11434/*`.

Browser extension APIs do not express telemetry, account, or backend access as a single permission,
so the last items are also enforced by the product architecture and source review, not just the
manifest list.

## Runtime access limitations

`activeTab` depends on a browser-recognized user gesture. Opening the research library by URL or
automating its DOM does not manufacture that grant. Browser-internal pages, browser store pages, and
browser-owned PDF viewers can also reject script injection. TraceMark reports those cases as
unsupported rather than requesting broader standing access. On a normal fresh or revisited source
tab, a failed anchor injection explains that the user must invoke the TraceMark toolbar action or
press `Alt+Shift+S` on that tab before retrying **Mark on page**. Protected pages can still reject
injection after that gesture.

Generated manifests can be audited with:

```sh
pnpm build:chrome
pnpm build:firefox
pnpm check:manifests
```

Release archives receive an additional contract check through `pnpm package:validate`. See
[TESTING.md](TESTING.md) for the complete package and browser evidence.
