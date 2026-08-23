## Summary

<!-- Explain the user-facing problem and the focused change. -->

## Privacy and architecture

- Permissions or origins changed: <!-- No / describe -->
- Stored data or migration changed: <!-- No / describe -->
- Network behavior changed: <!-- No / describe -->
- Backup/import behavior changed: <!-- No / describe -->
- Chrome/Firefox behavior differs: <!-- No / describe -->

## Verification

<!-- List exact commands and results. -->

- [ ] `pnpm format:check`
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] Relevant automated tests
- [ ] Chrome and Firefox builds when extension behavior changed
- [ ] Packaged-browser or manual gesture checks when applicable

## User-facing evidence

<!-- Add screenshots for visible UI changes and sanitized logs for behavior changes. -->

## Review checklist

- [ ] The change is focused and tests cover the intended behavior.
- [ ] Untrusted page, import, and AI data remain validated and inertly rendered.
- [ ] Documentation matches any permission, privacy, storage, workflow, or limitation changes.
- [ ] No generated output, browser profile, download, secret, or sensitive research is committed.
- [ ] Security-sensitive details are being handled according to `SECURITY.md`, not disclosed here.
