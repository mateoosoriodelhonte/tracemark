# Design decision record

This page records the project-level decisions that shape TraceMark proposals and reviews. It is a
decision index, not a second specification: the linked documents remain authoritative for the
runtime contracts they describe.

## Local-first storage over an application service

**Decision:** Keep research in the current browser profile, with no TraceMark account, backend,
telemetry, or cloud synchronization.

**Why:** A research tool can preserve user ownership and operate without making browsing data a
service-side asset. JSON backup and Markdown export provide user-controlled portability instead.

**Consequence:** Clearing a browser profile, uninstalling the extension, or losing a device can
make local research unavailable. Users need to download and protect their own backups. See the
[data lifecycle](DATA_LIFECYCLE.md) and [backup and restore guide](guides/BACKUP_AND_RESTORE.md).

## Temporary website access over standing host access

**Decision:** Use `activeTab` and runtime injection for capture and anchoring rather than static
content scripts and persistent website host permissions.

**Why:** TraceMark only needs page access after a visible user action. Limiting that access reduces
the extension's standing reach into ordinary browsing.

**Consequence:** Capture and marking can require the active tab and a qualifying gesture; protected
browser pages remain unavailable. See the [permission rationale](PERMISSIONS.md) and [user-gesture
reference](reference/USER_GESTURES.md).

## Exact anchoring over approximate page matches

**Decision:** Mark a quotation only when its text and saved context identify one unambiguous page
location.

**Why:** An approximate mark can misrepresent a source or make a changed page appear to support a
saved quotation.

**Consequence:** A changed, missing, or ambiguous quotation produces guidance instead of a mark.
See [anchoring behavior](reference/ANCHORING_BEHAVIOR.md).

## Explicit, revocable local AI over a default integration

**Decision:** Keep Ollama assistance disabled until the user requests it and grants the applicable
browser permissions. Recheck those grants for every request.

**Why:** A local service is still outside TraceMark's trust boundary. The user should choose when
selected research leaves extension storage and reaches that service.

**Consequence:** Local AI actions can be unavailable after a permission change and must fail closed
rather than assume access remains valid. See the [local AI contract](reference/LOCAL_AI_CONTRACT.md)
and [network boundaries](reference/NETWORK_BOUNDARIES.md).

## Strict boundary validation over permissive recovery

**Decision:** Validate extension messages, imported backups, persisted data, and optional AI output
with explicit schemas and reject invalid or ambiguous input.

**Why:** Page data, files, runtime messages, and provider output are separate trust boundaries.
Permissive parsing would make corrupted or untrusted data look like trustworthy research.

**Consequence:** Import and assistance workflows may stop with actionable errors instead of
silently repairing unknown data. See the [threat model](THREAT_MODEL.md) and [backup format](BACKUP_FORMAT.md).

## Updating this record

Add an entry when a proposed change establishes or reverses a durable project-level choice that a
future contributor could otherwise accidentally weaken. Link to the precise contract and evidence;
do not copy implementation details already maintained elsewhere.
