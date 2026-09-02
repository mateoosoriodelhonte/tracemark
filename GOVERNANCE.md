# Project governance

TraceMark is currently a maintainer-led open-source project. The repository owner makes final
decisions about scope, releases, security handling, and merge readiness after considering public
feedback and technical evidence.

## How decisions are made

Small fixes and documentation changes can be decided in their pull requests. Changes that add
permissions, network destinations, stored fields, migrations, browser surfaces, or user-visible
workflows should begin with an issue and a written design. The design must explain the research
problem, privacy impact, browser differences, failure behavior, tests, and recovery path.

Decisions favor the principles in [docs/PROJECT_PRINCIPLES.md](docs/PROJECT_PRINCIPLES.md): local
ownership, least privilege, explicit actions, safe refusal, portable data, and evidence-backed
claims. A feature's popularity does not override those constraints.

## Contributions and review

Anyone may propose an issue or pull request. Acceptance depends on project fit, maintainability,
privacy and security impact, cross-browser behavior, tests, documentation, and available reviewer
capacity. Submitting work does not guarantee inclusion or a particular release date.

The author is expected to respond to review findings and keep the branch current. The maintainer may
close inactive or out-of-scope proposals with an explanation. See [CONTRIBUTING.md](CONTRIBUTING.md)
and [docs/REVIEW_CHECKLIST.md](docs/REVIEW_CHECKLIST.md) for the evidence expected at review time.

## Releases and security

Only maintainers publish releases or browser-store submissions. Release decisions require the
applicable automated and native-browser evidence described in [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md).
Security reports are handled through [SECURITY.md](SECURITY.md), outside public issue details.

## Changing governance

Governance changes use a normal pull request with a clear reason and transition plan. If the
maintainer group grows, this document should be updated before relying on new voting, quorum,
succession, or release-authority rules.
