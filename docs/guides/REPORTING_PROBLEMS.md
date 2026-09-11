# Report a TraceMark problem safely

Choose the reporting route that gives maintainers enough context without exposing your research or a
security-sensitive detail.

## Start with the right category

- Use a documentation report when instructions are missing, unclear, or inconsistent with observed
  behavior.
- Use an accessibility report for a keyboard, focus, announcement, contrast, zoom, or assistive
  technology barrier.
- Use a bug report for a reproducible product malfunction.
- Use a feature request for a proposed workflow improvement.
- Use a **Security contact request** only to arrange a private channel for a possible vulnerability.

Search existing issues and the [documentation index](../README.md) first. A known browser limitation
may already have a workaround, and a duplicate report makes private-data review harder.

## Prepare a safe reproduction

Use a public test page or harmless synthetic text. Record the TraceMark version or commit, browser
and version, operating system, installation route, exact action, expected result, and actual result.
For accessibility reports, include the affected surface and input or assistive-technology setup.

Do not include real quotations, notes, JSON backups, private URLs, history, profile paths,
credentials, browser console dumps, permission details that expose browsing data, or vulnerability
reproduction/impact. Crop or redact screenshots before attachment.

## Follow up

Answer maintainer questions with the smallest additional sanitized detail. Keep the original private
data locally so you can compare it without posting it. If a harmless reproduction cannot be made,
say so rather than sharing sensitive material.

See [SUPPORT.md](../../SUPPORT.md), [TROUBLESHOOTING.md](TROUBLESHOOTING.md), and
[SECURITY.md](../../SECURITY.md) for the corresponding routes.
