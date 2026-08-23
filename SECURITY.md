# Security Policy

## Supported code

Security fixes are evaluated for the current `main` branch and the 1.0.x release candidate. TraceMark
is not currently published in the Chrome Web Store or Firefox Add-ons catalog, so there is no
store-delivered security-update channel yet.

## Report a vulnerability privately first

GitHub private vulnerability reporting is not currently enabled for this repository. Do not post
exploit details, proof-of-concept payloads, credentials, saved research, browsing data, or other
sensitive information in a public issue or pull request.

To request a private reporting channel, open a sanitized public issue titled
`Security contact request`. Include only:

- a way for the maintainers to contact you;
- the affected TraceMark version or commit, if known; and
- a broad category such as “permission boundary,” “backup import,” or “page injection.”

Do not describe reproduction steps or impact details publicly. A maintainer will use the supplied
contact information to arrange a non-public channel. If you cannot safely make even that sanitized
request, wait until a private reporting method is published rather than disclosing the vulnerability
in public.

## Before sending a private report

Use this checklist to make the report actionable without exposing unrelated data:

- reproduce against the latest GitHub release or current `main` in a fresh browser profile;
- replace saved research, URLs, and imported backups with the smallest harmless fixture that still
  demonstrates the behavior;
- record the browser, extension version or commit, operating system, and whether Ollama was enabled;
- separate directly observed behavior from expected impact or unverified assumptions;
- keep screenshots, console logs, exported backups, and proof-of-concept files private; and
- confirm whether the behavior crosses a TraceMark trust boundary documented in
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

If a clean-profile reproduction would destroy useful evidence, preserve the evidence first and
explain why the clean-profile step was skipped.

## What to include in the private report

- affected version, browser, browser version, and operating system;
- a concise impact statement;
- exact reproduction steps and a minimal proof of concept;
- whether the issue requires a user gesture, optional Ollama permission, or imported backup; and
- any suggested mitigation or disclosure timing.

Remove unrelated personal data and use harmless fixtures wherever possible.

## Response expectations

The project is contributor-maintained and cannot promise a fixed response or resolution time. A
maintainer should acknowledge a received private report, validate it against a clean profile, and
coordinate disclosure and a fix with the reporter when practical. Please do not publish details
until maintainers have had a reasonable opportunity to investigate and distribute a correction.

## Security boundaries worth reviewing

TraceMark intentionally avoids static website access, validates messages and imported backups,
renders saved quotation text inertly, and keeps Ollama behind an optional loopback origin. These
controls reduce risk but do not make browsers, local services, models, exported files, or other
software on the device trusted. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and
[docs/PERMISSIONS.md](docs/PERMISSIONS.md).
