# Manual test record template

Copy this template into release notes, a pull-request comment, or another durable review record. Use
synthetic research and include only checks actually observed in a native browser.

## Environment

- TraceMark commit and version:
- Browser, version, and channel:
- Operating system and architecture:
- Installation route and package hash:
- Tester and date:
- Fresh or reused profile:

## Preconditions

- Fixture or harmless public page:
- Existing extension permissions:
- Ollama installed/running/model, if applicable:
- Starting library state:

## Observations

| Check                           | Exact action | Expected result | Observed result | Pass/fail |
| ------------------------------- | ------------ | --------------- | --------------- | --------- |
| Toolbar capture                 |              |                 |                 |           |
| Selection context menu          |              |                 |                 |           |
| `Alt+Shift+S` capture           |              |                 |                 |           |
| Fresh-tab anchor recovery       |              |                 |                 |           |
| Exact and ambiguous anchoring   |              |                 |                 |           |
| Native side panel or sidebar    |              |                 |                 |           |
| JSON and Markdown downloads     |              |                 |                 |           |
| Optional permission flow        |              |                 |                 |           |
| Denial, revocation, and cleanup |              |                 |                 |           |

## Deviations and evidence

- Unexpected result and reproduction:
- Sanitized screenshot or log location:
- Related issue or follow-up:
- Checks not run and reason:

Do not call a row passed based only on component or packaged-page automation. Follow the current
browser procedures and evidence boundaries in [TESTING.md](../TESTING.md).
