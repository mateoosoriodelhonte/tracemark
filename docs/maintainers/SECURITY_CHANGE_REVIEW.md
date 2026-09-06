# Security-sensitive change review

Use this procedure for changes involving permissions, page injection, messages, schemas, imports,
storage, rendering of untrusted text, Local AI, downloads, build artifacts, or vulnerability fixes.
Keep embargoed details outside public issues and pull requests.

## Define the boundary

Describe the asset being protected, untrusted input, privileged component, user action, expected
failure mode, and browser differences. Separate an observed vulnerability from hypothetical impact.
If the change responds to a private report, agree on what can be recorded publicly before naming the
reporter, payload, affected data, or exploitation path.

## Review the implementation

- Validate page, message, backup, storage, and AI data before privileged use.
- Keep saved quotations, notes, URLs, tags, and model output inert in the interface and exports.
- Preserve size, count, URL-scheme, timeout, redirect, credential, and response-body bounds.
- Confirm writes that span related records are transactional and failure leaves recoverable state.
- Compare exact generated Chrome and Firefox permissions, origins, content scripts, and native
  surface declarations.
- Verify denial, missing state, malformed input, partial consent, revocation, timeout, and cleanup
  paths fail closed without exposing sensitive values in errors.

## Evidence and disclosure

Add the smallest regression test that would fail without the correction, then exercise the affected
package and native browser boundary. Use synthetic fixtures and keep proof-of-concept material,
private reports, browser profiles, and raw research out of commits and CI artifacts.

Before release, decide affected versions, severity, workaround safety, backport need, release notes,
credit, coordination date, and whether store review changes delivery timing. Recheck archive contents
and hashes after the final fix. Public text should help users act without publishing unnecessary
exploitation detail.

Follow [SECURITY.md](../../SECURITY.md), [THREAT_MODEL.md](../THREAT_MODEL.md), and the
[privacy review](PRIVACY_REVIEW.md).
