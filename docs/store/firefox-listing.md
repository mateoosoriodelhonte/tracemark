# Firefox Add-ons listing copy

This is the copy-paste source for the TraceMark 1.0.0 addons.mozilla.org (AMO) submission. It is a
draft: TraceMark has not been submitted, signed, reviewed, or published by Mozilla.

## Listing fields

| Field                                                                | Exact value                                                                                     |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Name                                                                 | `TraceMark`                                                                                     |
| Add-on URL slug                                                      | `tracemark` if available; the human submitter must accept an available AMO slug                 |
| Summary                                                              | `Save selected web quotations with their source in a searchable, local-first research library.` |
| Firefox category                                                     | `Bookmarks`                                                                                     |
| Firefox for Android categories                                       | None; submit the desktop Firefox package only                                                   |
| Experimental                                                         | `No`                                                                                            |
| Requires payment, non-free services/software, or additional hardware | `No`; optional Ollama is not required                                                           |
| Support website                                                      | `https://github.com/mateoosoriodelhonte/tracemark/issues`                                       |
| Support email                                                        | Enter a monitored address in AMO; no personal email is stored in this repository                |
| License                                                              | `MIT License`                                                                                   |
| Privacy policy                                                       | `Yes` — `https://github.com/mateoosoriodelhonte/tracemark/blob/main/PRIVACY.md`                 |

The human submitter must confirm that the slug is available, enter a monitored support email, and
verify that the public URLs resolve from the final `main` branch.

## Description

Copy the following text exactly:

```text
TraceMark saves the useful part of a webpage—the text you choose—together with its source.

Use the Firefox sidebar as a local research library:

• Save selected quotations with the page title, source URL, nearby context, collection, tags, and notes.
• Search quotation text and saved metadata, then filter by collection or tag.
• Reopen a source and ask TraceMark to mark an unambiguous exact quotation on the page.
• Edit or delete saved research and manage collections.
• Download complete JSON backups or readable Markdown exports.

Research is stored in the current Firefox profile. TraceMark has no account, telemetry, advertising, cloud sync, or application backend. Keep your own downloaded backups because clearing extension data, removing a browser profile, or uninstalling the extension can make local research unavailable.

Local AI is optional and disabled by default. If you separately install and run Ollama, you can explicitly enable it. Firefox asks separately for optional website-content data consent and access to 127.0.0.1:11434; TraceMark requires both grants before it sends selected saved quotations for a requested summary, explanation, tag suggestion, or overview. Ollama is not required for TraceMark's capture, library, search, marking, or export features. TraceMark does not download or start Ollama and does not send research to a TraceMark-operated cloud service.

Capture and marking work after a user action on a normal webpage. Browser-internal pages, store pages, browser-owned PDF viewers, changed quotations, and ambiguous repeated text may not be supported. TraceMark refuses to guess when it cannot identify one exact match.
```

## Screenshots

Upload these checked-in synthetic screenshots in order:

1. `docs/images/tracemark-library.png` — default library; Local AI disabled.
2. `docs/images/tracemark-search.png` — meaningful `provenance` search with one result.
3. `docs/images/tracemark-local-ai.png` — explicitly enabled mocked local AI, selected research,
   and local result.

All are 1280 × 800 PNGs and may be reused from the Chrome listing. The Chrome small promo tile is
not an AMO listing requirement.

## Notes for reviewers

Copy the following text exactly:

```text
TraceMark requires no account, login, payment, or test credentials. Ollama and Local AI are optional and are not needed for review.

Build environment: Node.js 22 or newer and pnpm 11.19.0. From the submitted source archive, run “pnpm install --frozen-lockfile” followed by “pnpm zip:firefox”. The upload artifact is “.output/tracemark-1.0.0-firefox.zip”. The repository uses WXT, Svelte, and TypeScript, so the matching source archive is attached for review.

Functional check:
1. Open a normal HTTPS webpage, select a sentence, and click the TraceMark toolbar action.
2. Confirm the selected quotation and source, then choose “Save quotation.”
3. Open “TraceMark Research Library” in the Firefox sidebar. Confirm the quotation appears and can be found with Search.
4. Choose Edit to add a tag or note, then save the change.
5. Return to the source tab and choose “Mark on page.” TraceMark marks only one unambiguous exact match and reports changed or repeated text instead of guessing.
6. Open Backups and verify that “Download JSON backup” and “Download Markdown” create local files.

The add-on has no static content script or standing website host permission. Capture and Mark on page require a browser-recognized user gesture and an active normal webpage. Browser-internal pages, AMO pages, and browser-owned PDF viewers can reject script injection.

Optional Local AI review: only if Ollama is already installed and running locally, choose “Enable local AI.” Firefox presents two separate prompts: approve optional website-content data consent and then the optional http://127.0.0.1:11434/* origin. TraceMark requires both grants, rechecks them before every request, and fails closed if either is missing or revoked. Select saved research and request an action. Choosing “Disable local AI” removes both grants separately. TraceMark does not install or start Ollama and does not require AI or a cloud service for its core workflow.
```

## Signing status and official references

The generated `.output/tracemark-1.0.0-firefox.zip` is unsigned. It cannot be permanently installed
in normal release or beta Firefox until Mozilla signs it. Uploading it to AMO is a human submission
step; download and retain Mozilla's signed result after acceptance.

- [Submit an add-on to AMO](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Mozilla signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [Mozilla source-code submission requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- [Current AMO extension categories](https://addons.mozilla.org/en-US/firefox/extensions/)
