# Store readiness review

Store readiness is a human review state, not a successful build. TraceMark is not currently listed
in the Chrome Web Store or Firefox Add-ons, and neither store submission nor signing should be
implied by source, CI, or local package success.

## Reconcile the submission set

Start at one reviewed release commit. Compare the generated Chrome and Firefox manifests with the
privacy policy, permission rationale, listing copy, reviewer instructions, screenshots, support
route, and public policy URLs. Resolve differences before entering any dashboard field.

Verify the package version, archive hashes, source-review ZIP, icon, screenshot dimensions, and
synthetic content. Confirm the store copy accurately states that Local AI is optional, separately
installed, loopback-only, and disabled by default.

## Human evidence

Record native Chrome and Firefox observations using a disposable profile: capture gestures,
fresh-tab anchor recovery, ambiguity, native side panel/sidebar, download behavior, and affected
permission prompts. Browser-owned interfaces must be observed in the actual browser; an extension
page in a normal tab is not equivalent evidence.

For Firefox, distinguish the local unsigned package from the artifact signed by Mozilla after an
accepted submission. For Chrome, distinguish a prepared upload ZIP from a published listing. Keep
publisher-account details and signed artifacts outside the repository unless they are deliberately
public release metadata.

## Decision

Use [RELEASE_EVIDENCE_RECORD.md](RELEASE_EVIDENCE_RECORD.md) to record the candidate and follow
[STORE_SUBMISSION.md](../STORE_SUBMISSION.md) for the full runbook. Stop when package hashes,
disclosures, public URLs, screenshots, or manual checks are unresolved.
