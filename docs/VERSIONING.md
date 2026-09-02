# Versioning and release identity

TraceMark uses three-part release versions such as `1.0.0`. The repository currently publishes
reviewed packages through GitHub Releases; browser-store versions and signing remain separate
distribution concerns.

## Choosing a version

- A **patch** release is appropriate for backward-compatible fixes, documentation bundled with a
  release, or maintenance that does not change supported workflows or backup structure.
- A **minor** release is appropriate for backward-compatible user-visible capability, a new optional
  workflow, or an additive data change with a tested migration and export story.
- A **major** release is required when users must change established workflows, supported
  environments are intentionally dropped, or portable data compatibility cannot be preserved.

Security impact can justify an expedited release but does not automatically determine the version
component. The actual compatibility effect does.

## Version locations

Before publishing, keep the intended version consistent in `package.json`, generated browser
manifests, package filenames, checksums, release notes, and store metadata. Generated `.output/`
files are evidence, not source, and should not be committed.

The JSON backup envelope has its own `version`, while stored records have `schemaVersion`. Those
values describe data contracts and do not need to equal the extension release version. Changing
either requires explicit compatibility and migration review.

## Tags and releases

Release tags use `v<version>`, for example `v1.0.0`, and should identify the exact reviewed source
commit. Do not move a published tag to a different commit. If a release is wrong, publish a new
version with corrected notes and artifacts instead of rewriting history.

Follow [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) and record artifact hashes and test evidence
before publication. User-visible changes belong in [../CHANGELOG.md](../CHANGELOG.md).
