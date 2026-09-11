# CI triage

Treat CI as evidence about the exact pull-request head, not a permanent approval for a branch. A new
push invalidates earlier conclusions until the relevant jobs have completed again.

## Read jobs in order

TraceMark CI first verifies source and release contracts, then exercises packaged Chromium, then
validates release packages. Start with the earliest failing job because later jobs can be skipped or
fail only as a consequence of an earlier build or dependency problem.

For each failure, record the workflow run URL, commit SHA, failed command, first meaningful error,
environment, and whether the same command reproduces locally. Do not paste secrets, private
research, browser-profile paths, or large generated archives into a public issue or pull request.

## Common boundaries

- Formatting, lint, or type failures usually identify a source or toolchain contract drift.
- Package validation can indicate manifest, archive inventory, permission, or version-name drift.
- Packaged Chromium failures require inspecting the actual generated extension and test fixture.
- Screenshot check failures can be structural even when a page looks acceptable; inspect the staged
  asset contract before regenerating anything.
- A Firefox lint warning should be compared with the documented baseline before treating it as a
  new regression.

## Recover safely

Reproduce with `pnpm install --frozen-lockfile` and the smallest relevant command. Keep generated
`.output/` material out of commits. If a dependency or runner image changed, compare the lockfile,
tool versions, manifests, package listings, and executable archive hashes before updating code.

After a fix, rerun the focused check and the full `pnpm check` gate. Release-impacting failures also
need the package and cross-browser procedures in [PACKAGE_AUDIT.md](PACKAGE_AUDIT.md) and
[CROSS_BROWSER_REVIEW.md](CROSS_BROWSER_REVIEW.md).
