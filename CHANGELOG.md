# Changelog

This file records user-visible TraceMark releases. Repository-only documentation and maintenance
work may appear in Git history without changing the extension version.

## Unreleased

- No extension behavior changes are currently scheduled for the next release.
- Documentation now includes task-focused user guides, trust references, and maintainer procedures.

## 1.0.0 — 2026-08-23

TraceMark's first public GitHub release established the local-first research workflow:

- Capture selected web text with its title, URL, and bounded surrounding context.
- Organize quotations using Inbox, collections, tags, and notes.
- Search stored quotation text and metadata locally.
- Mark one unambiguous exact quotation on its source page after a qualifying browser gesture.
- Export a complete JSON backup or readable Markdown notes and merge validated JSON backups.
- Optionally send explicitly selected saved research to a local Ollama service for summaries,
  explanations, tag suggestions, or an overview.
- Build validated Chrome and Firefox Manifest V3 packages from the same source tree.

The release does not include browser-store publication, an account, cloud sync, telemetry, or an
application backend. Firefox's archive is unsigned and intended for temporary installation or
review. See the [release page](https://github.com/mateoosoriodelhonte/tracemark/releases/tag/v1.0.0)
for packages and checksums.

For current limitations and evidence, read [README.md](README.md) and
[docs/TESTING.md](docs/TESTING.md).
