# Repository hygiene

Repository maintenance protects reviewers and contributors from stale artifacts, confusing routes,
and accidental disclosure. It is separate from changing the extension product.

## Periodic checks

- Confirm `main` is clean, protected as intended, and has no abandoned merge conflict.
- Prune local tracking references and close or update obsolete pull requests with an explanation.
- Review issue templates, labels, code owners, contribution routes, and support/security links for
  accuracy.
- Check that generated output, browser profiles, archives, downloads, and real research remain
  ignored and absent from tracked history.
- Verify the README, documentation index, store copy, and release policy still agree about what is
  published and what remains a manual or external step.

## Dependency and automation boundaries

Review Dependabot updates against the current head, CI result, lockfile diff, and toolchain contract.
Do not merge a changed bot head based on an approval or check attached to an earlier SHA. Keep GitHub
Actions permissions narrow and pin workflow actions according to the repository's reviewed policy.

Issue and pull-request templates should collect the smallest useful information. Public forms must
not encourage users to paste quotations, backups, private URLs, credentials, profile paths, or
vulnerability details.

## Records

Use small, focused commits for independent policy or metadata changes. Include the intent and
verification in the pull request, and retain CI links rather than committing terminal logs or build
archives. See [DEPENDENCY_UPDATES.md](DEPENDENCY_UPDATES.md),
[ISSUE_TRIAGE.md](ISSUE_TRIAGE.md), and [DOCUMENTATION_STYLE.md](DOCUMENTATION_STYLE.md).
