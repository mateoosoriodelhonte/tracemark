# Privacy checklist for users

Use this checklist when setting up TraceMark, enabling optional Local AI, exporting data, or moving
between profiles.

## Everyday use

- [ ] Capture only text you are permitted to store.
- [ ] Review source URLs for private hosts, document identifiers, or sensitive query parameters.
- [ ] Treat tags, collection names, and notes as research data, not harmless metadata.
- [ ] Remember that research stays in the current browser profile and is not automatically backed
      up or synced.
- [ ] Protect the operating-system account and browser profile that contain the library.

## Optional Local AI

- [ ] Install and trust the local Ollama service and selected model separately from TraceMark.
- [ ] Confirm the browser permission is only for `http://127.0.0.1:11434/*`.
- [ ] Review the selected quotations before requesting assistance; their IDs, text, titles, URLs,
      tags, and notes are sent to the local service.
- [ ] Remember that loopback HTTP is local but unencrypted.
- [ ] Disable Local AI and complete **Retry permission removal** if cleanup is pending.

## Backups and sharing

- [ ] Store JSON backups somewhere trusted and protected.
- [ ] Keep at least one known-good dated backup and test recovery with non-sensitive data.
- [ ] Use Markdown instead of JSON when a reader needs only a human-readable export.
- [ ] Inspect exports for private quotations, URLs, notes, tags, collection names, and AI output.
- [ ] Never attach a real backup or unredacted log to a public issue.

## Profile or installation changes

- [ ] Export before uninstalling, clearing extension data, replacing a profile, or changing an
      unpacked installation.
- [ ] Verify imported records in the destination before deleting the source profile.
- [ ] Re-grant optional permissions intentionally; they are not stored in backups.

See [PRIVACY.md](../../PRIVACY.md) and [DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md) for the complete
boundary description.
