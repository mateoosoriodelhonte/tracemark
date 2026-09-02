# Project principles

These principles guide product and maintenance decisions when requirements compete.

## Local ownership first

Research belongs to the user and stays in the current browser profile by default. TraceMark should
not require an account, application backend, telemetry, analytics, or cloud sync for its core
workflow. Exported files become the user's responsibility and must remain understandable and
portable.

## Least privilege

Request only the browser access needed for a visible user action. Temporary `activeTab` access and
runtime injection are preferred to standing website permissions. Optional origins must be narrow,
explicit, revocable, and checked again before use.

## Safe refusal over guessing

When TraceMark cannot identify one exact quotation, validate an import, inspect a permission, or
trust a boundary result, it should stop with actionable guidance. Silent approximation is a poor
trade for research provenance or privacy.

## Data boundaries are product behavior

Schemas, storage, imports, exports, extension messages, page content, and local-AI responses are
trust boundaries. Validation, inert rendering, size limits, and transactional changes are part of
the user experience—not optional hardening added later.

## Cross-browser honesty

Chrome and Firefox expose different native surfaces and permission behavior. Documentation and
release evidence must say which behavior was automated, manually observed, inferred, or still
untested. A normal extension page is not proof of browser chrome or a permission prompt.

## Evidence before claims

Tests, package inspection, artifact hashes, sanitized screenshots, and recorded manual checks
support release claims. Passing one layer must not be described as proof of another. Known limits
remain visible until they are actually resolved.

## Focused maintenance

Prefer small changes with one clear purpose, no unrelated refactoring, and a recovery story.
Dependencies and new abstractions need demonstrated value. Documentation should help a specific
reader complete or review a task rather than merely repeat another page.

These principles complement [ARCHITECTURE.md](ARCHITECTURE.md), [PERMISSIONS.md](PERMISSIONS.md),
and [../GOVERNANCE.md](../GOVERNANCE.md).
