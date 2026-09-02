# Privacy review

Every change should preserve TraceMark's local-first default or document an explicitly approved
change to that boundary. Review actual data flow and browser capabilities rather than relying on a
feature name such as “local,” “export,” or “temporary.”

## Map the data flow

For each new or changed path, identify:

- the triggering user action and whether it is explicit;
- source data, derived fields, and sensitive content involved;
- every in-memory, IndexedDB, browser-storage, webpage, file, or network destination;
- validation and normalization at each trust boundary;
- retention, deletion, export, and recovery behavior; and
- failure behavior when permission, parsing, storage, or transport is unavailable.

Page content, URLs, selections, messages, backup files, and AI responses are untrusted. Confirm
strict schema parsing and inert rendering. A loopback destination limits routing but does not add
encryption or authenticate the process listening on the port.

## Repository surfaces to compare

Review `wxt.config.ts`, background and content-script boundaries, domain schemas, database and
settings repositories, import/export services, UI copy, package assertions, and tests. Then compare
[PRIVACY.md](../../PRIVACY.md), [PERMISSIONS.md](../PERMISSIONS.md),
[DATA_LIFECYCLE.md](../DATA_LIFECYCLE.md), store privacy answers, and applicable user guides.

Any new origin or permission needs an exact purpose, least-privilege alternative analysis, consent
and revocation path, package assertion, browser-specific behavior, and user-visible failure mode.
Any stored-field change needs migration, backup compatibility, deletion, and downgrade analysis.

## Evidence and conclusion

Use synthetic records and redact URLs, quotations, prompts, profile paths, and logs. Record whether
the change affects permissions, network traffic, stored data, exports, backups, screenshots, or
browser differences, including an explicit “no” when reviewed.

The conclusion should name remaining limitations and the evidence used. “No privacy impact” is not
enough when the diff touches a trust boundary; explain why the set of data, destinations, triggers,
and retention behavior remains unchanged.
