# Screenshot workflow

Repository screenshots are deterministic product and store assets. They use synthetic research and
must never expose a contributor's real browsing or library data.

## Generate and inspect

From a frozen-lockfile checkout, run:

```sh
pnpm screenshots
pnpm screenshots:check
```

The generator stages all assets, validates them, and promotes the complete set together. Check mode
verifies expected filenames, PNG structure, dimensions, decoded image data, and a minimum content
size. It does not judge copy, crop, contrast, visual hierarchy, or whether the screen represents the
current workflow.

Inspect every image at full size. Confirm the visible state is intentional, text is legible, no
control is clipped, synthetic URLs and quotations are used, and Local AI is not presented as
required or cloud-hosted. Compare light/dark assumptions with the store listing and README placement.

## Asset contract

The current set contains three 1280 × 800 product screenshots and one 440 × 280 Chrome promotional
tile under `docs/images/`. If the inventory or dimensions change, update the generator constants,
tests, README, store listing copy, and submission runbook in the same review.

Run generation twice in the same environment and compare file hashes when determinism matters for a
release. A difference should be explained by an intentional source, browser, font, or rendering
change before replacing reviewed assets.

## Review boundaries

A generated image proves only the captured extension-page state. It does not prove toolbar capture,
context-menu capture, a keyboard-command gesture, a permission prompt, Chrome side-panel chrome, or
Firefox sidebar chrome. Follow [TESTING.md](../TESTING.md) for those observations and
[STORE_SUBMISSION.md](../STORE_SUBMISSION.md) for upload order and human checks.
