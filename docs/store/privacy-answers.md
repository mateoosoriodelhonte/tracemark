# Store privacy and permission answers

These answers describe TraceMark 1.0.0 as built. They are store-form input, not evidence that either
store has reviewed or accepted the extension. The public privacy policy URL for both stores is
`https://github.com/mateoosoriodelhonte/tracemark/blob/main/PRIVACY.md`; verify it after merge.

## Chrome Privacy practices

### Single purpose

```text
Save user-selected web quotations with their source and organize them in a local research library.
```

### Permission justifications

| Permission shown by Chrome               | Exact justification                                                                                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`                              | `Temporarily accesses only the active page after the user invokes TraceMark so it can read the current selection or find one saved exact quotation. It does not provide standing access to browsing activity.`                                                            |
| `scripting`                              | `Injects TraceMark's packaged capture or marking script into the active page after a qualifying user action. TraceMark has no static content script and does not inject into every site.`                                                                                 |
| `contextMenus`                           | `Adds “Save selection to TraceMark” to the selection context menu and handles that explicit save action.`                                                                                                                                                                 |
| `storage`                                | `Stores the selected theme and optional local-AI provider/model preferences in browser.storage.local. Research records are stored separately in extension IndexedDB.`                                                                                                     |
| `sidePanel`                              | `Registers and opens the TraceMark Research Library in Chrome's side panel.`                                                                                                                                                                                              |
| Optional host `http://127.0.0.1:11434/*` | `Requested only when the user chooses “Enable local AI.” It lets TraceMark send the stored fields of user-selected saved quotations to an Ollama service running on the same device. Ollama is optional, disabled by default, and not installed or started by TraceMark.` |

### Remote code

Select `No, I am not using remote code.`

Exact explanation if the dashboard offers a text field:

```text
TraceMark executes only code packaged in the extension. Optional requests to a user-enabled local Ollama API return data, not executable code.
```

### Data-use checkboxes

Chrome requires disclosure even when data is only processed or stored locally. Select:

- `Web history`: **Yes** — only the source URL and hostname attached to a quotation the user
  explicitly saves, not the browser history database or background browsing.
- `Website content`: **Yes** — the selected quotation, nearby context, page title, source links,
  tags, notes, and collections used for the requested research workflow.
- Every other data-type checkbox: **No**. In particular, no personally identifiable information,
  health information, financial/payment information, authentication information, personal
  communications, location, or generalized user-activity monitoring is collected.

Select all required limited-use certifications:

- `I do not sell or transfer user data to third parties, outside of the approved use cases.`
- `I do not use or transfer user data for purposes that are unrelated to my item's single purpose.`
- `I do not use or transfer user data to determine creditworthiness or for lending purposes.`

Data handling explanation, if requested:

```text
Saved research remains in the current browser profile by default. TraceMark has no account, telemetry, advertising, cloud sync, or application backend. Local AI is optional and disabled by default. After the user enables the optional 127.0.0.1:11434 origin and selects saved research for an AI action, TraceMark sends only the selected records' internal highlight ID, quotation, title, source URL, tags, and note to the Ollama service running on that device. TraceMark does not sell user data.
```

## Firefox data collection and permissions

The Firefox manifest declares:

```json
{
  "data_collection_permissions": {
    "required": ["none"],
    "optional": ["websiteContent"]
  }
}
```

Use these exact explanations if AMO requests clarification:

```text
Required data collection: none. TraceMark stores saved research in the local Firefox profile and does not transmit it to a TraceMark-operated service.

Optional website content: only after the user enables Local AI and approves the optional http://127.0.0.1:11434/* origin, TraceMark sends the stored fields of user-selected saved quotations to an Ollama process on the same device for the requested action. Local AI is disabled by default and is not required for capture, library, search, marking, backup, or export.
```

Required extension-permission explanations match the Chrome answers for `activeTab`, `scripting`,
`contextMenus`, and `storage`. Firefox uses its generated `sidebar_action` for the research library
instead of Chrome's `sidePanel` permission. The only optional origin is
`http://127.0.0.1:11434/*`.

## Audit boundary

TraceMark does not request browser history, cookies, tabs, clipboard, `<all_urls>`, a required host
origin, or a static content script. Downloads are initiated by the user for backups/exports; no
`downloads` permission is requested. The optional Ollama request uses unencrypted loopback HTTP,
which is disclosed in the product UI and privacy policy.

Official form guidance:

- [Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [Chrome user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Mozilla add-on policies](https://extensionworkshop.com/documentation/publish/add-on-policies/)
- [Firefox built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)
