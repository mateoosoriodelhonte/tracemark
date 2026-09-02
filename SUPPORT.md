# TraceMark support

TraceMark is a local-first browser extension. Public support reports should use harmless examples:
do not include saved quotations, private URLs, browsing history, exported backups, credentials,
browser-profile paths, or vulnerability details.

## Help using TraceMark

Start with the documentation map in [README.md](README.md). The most common workflows are covered
by the getting-started, capture and anchoring, library and search, backup and restore, local-AI,
and troubleshooting guides in `docs/guides/`. For browser-specific limitations, read
[docs/PERMISSIONS.md](docs/PERMISSIONS.md) and [docs/FAQ.md](docs/FAQ.md).

If the documentation does not answer the question, search existing GitHub issues first, then open a
public issue with a sanitized description:

- [Search TraceMark issues](https://github.com/mateoosoriodelhonte/tracemark/issues)
- [Open a general support issue](https://github.com/mateoosoriodelhonte/tracemark/issues/new)

State the TraceMark version or commit, browser and version, operating system, installation method,
and the smallest safe example. Maintainers cannot inspect a user’s local browser profile or saved
research.

## Report a bug

Use the dedicated bug-report form:

- [Report a reproducible TraceMark bug](https://github.com/mateoosoriodelhonte/tracemark/issues/new?template=bug_report.yml)

Include the exact steps, expected and actual results, browser/OS details, and sanitized screenshots
or logs if useful. Prefer a public test page or a minimal local fixture. If the report concerns a
permission prompt, capture, anchor, import, or export, say which browser-native action was used.
Do not paste backup contents or quotation text from private research.

## Request a feature

Use the feature-request form:

- [Propose a focused TraceMark feature](https://github.com/mateoosoriodelhonte/tracemark/issues/new?template=feature_request.yml)

Describe the research problem, the smallest useful behavior, alternatives or current workarounds,
and the expected privacy, permission, storage, export/import, network, and browser impact. Features
that add standing page access, browser permissions, network destinations, or persistent data need
an explicit design discussion before implementation.

## Report a security issue privately

Do not file a public bug report or feature request for a vulnerability. GitHub private vulnerability
reporting is not currently enabled for this repository. Follow [SECURITY.md](SECURITY.md): request a
private channel through a sanitized public issue titled **Security contact request**, containing only
a way to contact you, the affected version or commit if known, and a broad category. Do not include
reproduction steps, impact details, proof-of-concept code, credentials, saved research, URLs, or
other sensitive data publicly.

If even that sanitized request would be unsafe, wait for a private reporting method to be published
rather than disclosing the issue. The security policy explains the information to send after a
maintainer establishes a private channel and the project’s response expectations.
