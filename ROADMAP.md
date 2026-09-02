# Roadmap

This roadmap describes directions worth evaluating; it is not a release promise. Privacy,
permission scope, cross-browser feasibility, maintenance cost, and verified user need determine
whether an item proceeds.

## Maintain the 1.x foundation

- Keep Chrome and Firefox packages reproducible and reviewable.
- Complete and periodically repeat native-browser gesture and permission evidence.
- Preserve import compatibility for version 1 JSON backups.
- Improve accessibility evidence across the native side-panel and sidebar surfaces.
- Keep documentation synchronized with actual behavior and store requirements.

## Candidate improvements

- Safer ways to diagnose changed or ambiguous source text without guessing at an anchor.
- More transparent backup inspection and recovery reporting.
- Additional local organization workflows that do not require an account or cloud service.
- Better cross-profile migration guidance and compatibility checks.
- Optional local-assistance improvements that retain explicit selection, loopback-only access, and
  fail-closed permission checks.

Each candidate needs a focused issue and design before implementation. Proposals that require
standing website access, automatic background collection, a remote backend, or silent data
transmission carry a high burden of proof and may conflict with the project principles.

## Not currently planned

TraceMark does not currently plan to add accounts, telemetry, behavioral analytics, automatic cloud
sync, or a hosted AI service. Browser-store publication remains separate release work rather than a
change to the extension's local-first architecture.

## Proposing roadmap work

Use the feature-request form and explain the research problem, smallest useful behavior,
alternatives, privacy and permission impact, stored-data changes, backup compatibility, browser
differences, and validation plan. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[GOVERNANCE.md](GOVERNANCE.md).
