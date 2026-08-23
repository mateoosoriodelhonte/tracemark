# Chrome Web Store listing copy

This is the copy-paste source for the TraceMark 1.0.0 Chrome Web Store submission. It is a draft:
TraceMark has not been submitted, reviewed, or published.

## Listing fields

| Field              | Exact value                                                             |
| ------------------ | ----------------------------------------------------------------------- |
| Name               | `TraceMark`                                                             |
| Summary            | `Save the useful part of the web — and keep the source attached.`       |
| Primary category   | `Productivity`                                                          |
| Language           | `English (United States)`                                               |
| Visibility         | `Public`                                                                |
| Regions            | `All regions`                                                           |
| Homepage URL       | `https://github.com/mateoosoriodelhonte/tracemark`                      |
| Support URL        | `https://github.com/mateoosoriodelhonte/tracemark/issues`               |
| Privacy policy URL | `https://github.com/mateoosoriodelhonte/tracemark/blob/main/PRIVACY.md` |
| In-app purchases   | `No`                                                                    |

The human submitter must confirm that the public URLs resolve from the final `main` branch before
submission.

## Detailed description

Copy the following text exactly:

```text
TraceMark saves the useful part of a webpage—the text you choose—together with its source.

Build a local research library without creating an account:

• Save selected quotations with the page title, source URL, nearby context, collection, tags, and notes.
• Search quotation text and saved metadata, then filter by collection or tag.
• Reopen a source and ask TraceMark to mark an unambiguous exact quotation on the page.
• Edit or delete saved research and manage collections.
• Download complete JSON backups or readable Markdown exports.

Research is stored in the current browser profile. TraceMark has no account, telemetry, advertising, cloud sync, or application backend. Keep your own downloaded backups because clearing extension data, removing a browser profile, or uninstalling the extension can make local research unavailable.

Local AI is optional and disabled by default. If you separately install and run Ollama, you can explicitly enable access to 127.0.0.1:11434 and request a summary, explanation, tag suggestions, or an overview for selected saved quotations. Ollama is not required for TraceMark's capture, library, search, marking, or export features. TraceMark does not download or start Ollama and does not send research to a TraceMark-operated cloud service.

Capture and marking work after a user action on a normal webpage. Browser-internal pages, store pages, browser-owned PDF viewers, changed quotations, and ambiguous repeated text may not be supported. TraceMark refuses to guess when it cannot identify one exact match.
```

## Graphic assets

Upload the assets without borders, device frames, captions, or resizing:

| Dashboard slot   | File                                      | Size       | Content                                                                 |
| ---------------- | ----------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| Store icon       | `public/icon/128.png`                     | 128 × 128  | Checked-in TraceMark icon                                               |
| Screenshot 1     | `docs/images/tracemark-library.png`       | 1280 × 800 | Default local-first library; Local AI disabled                          |
| Screenshot 2     | `docs/images/tracemark-search.png`        | 1280 × 800 | Meaningful `provenance` search with one result                          |
| Screenshot 3     | `docs/images/tracemark-local-ai.png`      | 1280 × 800 | Explicitly enabled mocked local AI, selected research, and local result |
| Small promo tile | `docs/images/tracemark-promo-440x280.png` | 440 × 280  | Code-native product identity artwork                                    |

Do not upload a marquee tile for 1.0.0. No marquee asset is included.

## Test instructions

Copy the following into the reviewer test-instructions field:

```text
TraceMark requires no account, login, payment, or test credentials. Ollama and Local AI are optional and are not needed for review.

1. Open a normal HTTPS webpage, select a sentence, and click the TraceMark toolbar action.
2. Confirm the selected quotation and source, then choose “Save quotation.”
3. Open “TraceMark Research Library” in Chrome's side panel. Confirm the quotation appears and can be found with Search.
4. Choose Edit to add a tag or note, then save the change.
5. Close the original source tab, reopen the same source in a fresh tab, and choose “Mark on page.” Confirm TraceMark tells you to invoke its toolbar action or Alt+Shift+S on that tab and retry. Invoke the TraceMark toolbar action on the fresh tab, then retry “Mark on page.” TraceMark marks only one unambiguous exact match and reports changed or repeated text instead of guessing.
6. Open Backups and verify that “Download JSON backup” and “Download Markdown” create local files.

The extension has no static content script or standing website host permission. Capture and Mark on page require a browser-recognized user gesture and an active normal webpage. Browser-internal pages, Chrome Web Store pages, and browser-owned PDF viewers can reject script injection.

Optional Local AI review: only if Ollama is already installed and running locally, choose “Enable local AI,” approve the optional http://127.0.0.1:11434/* origin, select saved research, and request an action. TraceMark does not install or start Ollama and does not require AI or a cloud service for its core workflow.
```

## Official references

- [Chrome Web Store image requirements](https://developer.chrome.com/docs/webstore/images)
- [Complete the Chrome listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)
- [Fill out Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)

The exact privacy answers and permission justifications are in
[privacy-answers.md](privacy-answers.md).
