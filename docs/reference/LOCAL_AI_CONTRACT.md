# Local AI contract

TraceMark's optional Local AI feature is a constrained request to a separately installed Ollama
service. It is disabled by default and is not required for core research workflows.

## Enabling and permission state

The configured origin is exactly `http://127.0.0.1:11434/*`. Chromium requests that optional origin
from the enable action. Firefox first requests optional website-content and browsing-activity data
consent, then exposes **Continue enabling local AI** for the separate origin request.

All applicable grants must be present before a request. Missing, revoked, unsupported, unknown, or
cleanup-pending permission state disables or blocks the provider rather than assuming access.
Disabling saves provider `none` and requests grant removal; failures surface
**Retry permission removal**.

## Request contract

The user selects between one and twenty currently visible highlights and chooses **Summarize**,
**Explain**, **Suggest tags**, or **Overview**. TraceMark sends the model name, task, and each selected
highlight's internal ID, quote, title, URL, tags, and note to `/api/chat`.

The request is non-streaming, omits credentials, rejects redirects, sets a 30-second timeout, and
asks for a structured object. Research excerpts are identified to the model as untrusted quoted
material whose embedded instructions should be ignored.

## Response contract

TraceMark limits response bodies to one MiB and parses Ollama's response envelope. Text actions must
produce a nonblank `content` string. Tag assistance must produce a bounded tag array, which is
normalized before storage. Invalid, unavailable, missing-model, and timeout outcomes are distinct
errors. Suggested tags remain informational and are not silently applied.

Saved results link to their source highlight IDs and render as inert text. Deleting a source
highlight removes dependent saved AI results. Ollama and its models remain separate software and
trust boundaries; loopback HTTP is not encrypted. See [../guides/LOCAL_AI.md](../guides/LOCAL_AI.md).
