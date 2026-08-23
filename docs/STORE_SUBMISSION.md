# TraceMark 1.0.0 store submission runbook

TraceMark is ready to prepare for human store review, but publication is not automated. As of
August 22, 2026, it has not been submitted to, signed by, reviewed by, or published in the Chrome
Web Store or Firefox Add-ons (AMO).

## Submission inventory

Create and validate release packages from a clean checkout:

```sh
pnpm install --frozen-lockfile
pnpm package:build
pnpm package:validate
pnpm screenshots:check
```

| Purpose               | Exact file                                | Status before submission              |
| --------------------- | ----------------------------------------- | ------------------------------------- |
| Chrome upload         | `.output/tracemark-1.0.0-chrome.zip`      | Unsigned store-upload ZIP             |
| Firefox upload        | `.output/tracemark-1.0.0-firefox.zip`     | Unsigned; Mozilla signing required    |
| Firefox source review | `.output/tracemark-1.0.0-sources.zip`     | WXT-generated matching source archive |
| Store icon            | `public/icon/128.png`                     | 128 × 128 PNG                         |
| Screenshot 1          | `docs/images/tracemark-library.png`       | 1280 × 800 PNG                        |
| Screenshot 2          | `docs/images/tracemark-search.png`        | 1280 × 800 PNG                        |
| Screenshot 3          | `docs/images/tracemark-local-ai.png`      | 1280 × 800 PNG                        |
| Chrome small promo    | `docs/images/tracemark-promo-440x280.png` | 440 × 280 PNG                         |

The source archive must accompany the Firefox version because WXT/Svelte/TypeScript build the
submitted add-on code. The reviewer build is Node.js 22 or newer and pnpm 11.19.0:

```sh
pnpm install --frozen-lockfile
pnpm zip:firefox
```

## Human-only preflight checklist

- [ ] Merge the release commit to `main`; confirm the version is `1.0.0` and the working tree is
      clean.
- [ ] Run the full release verification required by [Testing TraceMark](TESTING.md), including the
      manual browser-gesture checklists. Screenshot generation does not prove browser-chrome
      capture or anchor gestures.
- [ ] Run `pnpm screenshots` twice locally and compare checksums as a same-environment determinism
      sanity check; then run `pnpm screenshots:check`.
- [ ] Inspect all four PNGs at full size for legibility, crop, correct state, and synthetic-only
      content.
- [ ] Verify `https://github.com/mateoosoriodelhonte/tracemark`, the public privacy-policy URL, and
      the support Issues URL resolve without authentication.
- [ ] Choose and monitor a support email in the publisher accounts. Do not add a personal address
      to the repository solely to satisfy a dashboard field.
- [ ] Rebuild packages from the exact release commit; record SHA-256 checksums before upload.
- [ ] Confirm the Chrome and Firefox upload packages contain no secrets, private fixtures, store
      screenshots, source maps, or local filesystem paths by running `pnpm package:validate` and
      inspecting those two ZIP listings. Separately inspect the source-review ZIP for secrets or
      private material; it intentionally contains reviewable source, tests, and documentation.
- [ ] Confirm Local AI remains described as optional, disabled by default, and dependent on a
      separately installed/running local Ollama service—not as required AI or a cloud feature.

## Chrome Web Store checklist

- [ ] Register or select the intended publisher account and complete its account requirements.
- [ ] Add a new item and upload `.output/tracemark-1.0.0-chrome.zip`.
- [ ] Copy every field from [Chrome Web Store listing copy](store/chrome-listing.md), including
      `Productivity`, `Public`, and `All regions`.
- [ ] Upload `public/icon/128.png`, all three 1280 × 800 screenshots in the documented order, and
      `docs/images/tracemark-promo-440x280.png`. Do not upload a marquee tile.
- [ ] Copy the single-purpose, permission, remote-code, data-use, and certification answers from
      [Store privacy and permission answers](store/privacy-answers.md).
- [ ] Enter the privacy-policy URL and verify its content matches the dashboard disclosures.
- [ ] Paste the documented Chrome reviewer test instructions. No credentials are required.
- [ ] Review the Distribution tab and confirm `Public`, `All regions`, and no in-app purchases.
- [ ] Manually choose **Submit for Review**. If deferred publishing is desired, select it in the
      confirmation dialog; store review and publication are external human-controlled states.
- [ ] Record the item ID, submission time, review status, and final listing URL outside this runbook.

Official Chrome guidance:

- [Supplying store images](https://developer.chrome.com/docs/webstore/images)
- [Complete the listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing/)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)

## Firefox Add-ons checklist

- [ ] Sign in to the intended AMO developer account and choose **Submit a New Add-on**.
- [ ] Choose **On this site** for a public AMO listing and select desktop Firefox only.
- [ ] Upload `.output/tracemark-1.0.0-firefox.zip`. This local ZIP is unsigned; AMO must sign the
      accepted version for permanent installation in release or beta Firefox.
- [ ] When AMO asks for source, answer **Yes** and upload
      `.output/tracemark-1.0.0-sources.zip` with the documented Node/pnpm build instructions.
- [ ] Copy every field, description, `Bookmarks` category, privacy-policy URL, and reviewer notes
      from [Firefox Add-ons listing copy](store/firefox-listing.md).
- [ ] Enter a monitored support email and confirm the support website.
- [ ] Upload the three 1280 × 800 screenshots in the documented order.
- [ ] Confirm `Experimental: No`, `MIT License`, and that no payment, non-free service, software, or
      additional hardware is required. Ollama is an optional enhancement only.
- [ ] Confirm the manifest disclosure is required `none`, optional `websiteContent`, consistent
      with [Store privacy and permission answers](store/privacy-answers.md).
- [ ] Confirm the Local AI reviewer instructions describe Firefox's separate website-content and
      loopback-origin prompts, both-grants fail-closed check, and separate removal on disable.
- [ ] Manually submit the version. Record the submission state and respond to reviewer questions.
- [ ] After Mozilla signs the version, download and retain the signed artifact; do not relabel the
      locally generated unsigned ZIP as signed.
- [ ] Record the AMO slug, add-on ID, signed-file checksum, review status, and final listing URL
      outside this runbook.

Official Mozilla guidance:

- [Submitting an add-on](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/)
- [Signing and distribution overview](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)
- [Source-code submission](https://extensionworkshop.com/documentation/publish/source-code-submission/)
- [Firefox built-in data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/)

## Stop conditions

Do not submit if a package or screenshot checksum changed after review; a dashboard answer differs
from the built manifest or privacy policy; the privacy/support URLs are inaccessible; the required
manual browser checks are incomplete; or any copy implies automated browser-chrome capture/anchor
coverage, store acceptance, publication, required AI, or a TraceMark cloud service.
