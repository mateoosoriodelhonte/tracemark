# Network boundaries

Core TraceMark capture, organization, search, anchoring, backup, and export workflows do not require
an application backend. The extension has no telemetry, analytics, cloud sync, or static website
host permission.

## Webpage boundary

Capture and anchoring operate through temporary `activeTab` access and runtime injection into the
active main frame. This is browser-mediated page access, not an HTTP request by TraceMark. Page DOM,
URLs, selections, and content-script responses are untrusted and validated before storage or use.

## Optional Ollama boundary

When the user enables Local AI, grants the exact optional origin, selects saved quotations, and
chooses an AI action, TraceMark sends a `POST` request to
`http://127.0.0.1:11434/api/chat`. The request omits credentials, disables cache, rejects redirects,
uses non-streaming output, and times out after 30 seconds.

The payload contains the requested task, model name, and selected highlights' internal IDs,
quotations, titles, URLs, tags, and notes. Responses over one MiB or outside the expected structured
schema are rejected. The model response is treated as untrusted before storage and rendering.

Loopback limits the address to the local device but does not encrypt HTTP, authenticate the process
listening on the port, or control network behavior performed by Ollama, a model, or other local
software. Those components are separate trust decisions.

## Downloads and source links

Opening a saved source navigates the browser to its stored HTTP(S) URL. Exporting creates a browser
download using an object URL; TraceMark does not upload that file. After creation, storage,
transmission, encryption, and deletion of the file are outside the extension boundary.

Any proposal for a new network destination must document the exact origin, fields, trigger,
credentials, redirects, timeouts, response limits, optional-permission lifecycle, and user-visible
failure behavior. See [LOCAL_AI_CONTRACT.md](LOCAL_AI_CONTRACT.md) and
[../THREAT_MODEL.md](../THREAT_MODEL.md).
