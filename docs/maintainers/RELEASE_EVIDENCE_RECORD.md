# Release evidence record template

Use one completed record for each candidate that may be published. It identifies the exact source,
artifacts, automated evidence, manual observations, and unresolved limitations reviewed for that
candidate.

## Candidate identity

- Version and tag:
- Source commit:
- Build date, host, and architecture:
- Node.js and pnpm versions:
- Reviewer:
- Intended distribution channels:

## Artifact inventory

| Artifact           | Bytes | SHA-256 | Purpose                     |
| ------------------ | ----: | ------- | --------------------------- |
| Chrome ZIP         |       |         | Browser/store package       |
| Firefox ZIP        |       |         | Browser/store package       |
| Firefox source ZIP |       |         | Mozilla source review       |
| Checksum file      |       |         | Executable archive identity |

Record where the artifacts were produced and confirm they came from the source commit above. Attach
archive listings or a CI artifact link without committing generated packages to the repository.

## Verification

- Frozen install result:
- `pnpm check` result and test count:
- Packaged Chromium result:
- Strict packaged Firefox result:
- Package validation and Firefox lint result:
- Screenshot regeneration/check result:
- Native Chrome record:
- Native Firefox record:

## Contract review

- Permissions and optional origins changed:
- Stored data, migration, or backup format changed:
- Network destinations or transmitted fields changed:
- Privacy policy, store answers, and release notes synchronized:
- Known limitations and incomplete checks:
- Release decision and approver:

Complete [RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md),
[PACKAGE_AUDIT.md](PACKAGE_AUDIT.md), and [MANUAL_TEST_RECORD.md](MANUAL_TEST_RECORD.md) rather than
using this template as evidence by itself.
