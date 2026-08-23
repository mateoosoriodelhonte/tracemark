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

Firefox also declares required data collection `none` and optional built-in data consent
`websiteContent`. That data consent is not a host permission and is not granted at installation.

## Why each permission exists

| Permission     | Browser            | Use and boundary                                                                                                                                                             |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`    | Chrome and Firefox | A qualifying toolbar, context-menu, or command gesture grants temporary access to the active page for capture or anchoring. It is not permanent access to browsing activity. |
| `scripting`    | Chrome and Firefox | Injects the packaged capture or anchor script at runtime after a user action. TraceMark does not inject a static script into every page.                                     |
| `contextMenus` | Chrome and Firefox | Adds **Save selection to TraceMark** to the selection context menu and handles that explicit action.                                                                         |
| `storage`      | Chrome and Firefox | Reads and writes theme and AI provider/model settings through `browser.storage.local`. Research data is stored separately in extension IndexedDB.                            |
| `sidePanel`    | Chrome only        | Registers the research library as Chrome's side panel. Firefox uses its generated `sidebar_action` manifest entry instead.                                                   |

## Optional Ollama origin

`http://127.0.0.1:11434/*` is not granted at installation. TraceMark requests it only when the user
chooses **Enable local AI**, and the browser controls the permission prompt. The origin permits the
background context to call the local Ollama chat API. TraceMark's implementation sends selected
stored research only for a requested AI action and does not use `localhost`, IPv6 loopback, another
port, a LAN address, or `ollama.com`.

The URL uses HTTP, not HTTPS. Loopback traffic is not encrypted and the permission does not make the
Ollama process, models, browser, operating system, or other local software trustworthy. Users can
disable local AI and remove the origin permission through TraceMark; they can also inspect or revoke
it in browser extension settings.

On Firefox, the **Enable local AI** gesture makes two separate optional permission requests: first
`data_collection: ["websiteContent"]`, then the exact Ollama origin. TraceMark requires both grants
before every Ollama request. If the browser does not expose built-in data consent, or either grant
is revoked outside TraceMark, transmission fails closed. Disabling local AI separately removes the
origin and website-content consent. Chromium requests and checks only the optional origin.

Failed removal remains recoverable: the disabled library blocks **Enable local AI** and exposes
**Retry permission removal** until cleanup succeeds. On reload, TraceMark reconciles the disabled
preference with applicable browser grants and surfaces the same explicit cleanup control without
automatically removing a grant.

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
unsupported rather than requesting broader standing access.

Generated manifests can be audited with:

```sh
pnpm build:chrome
pnpm build:firefox
pnpm check:manifests
```

Release archives receive an additional contract check through `pnpm package:validate`. See
[TESTING.md](TESTING.md) for the complete package and browser evidence.
