# Use optional local AI with Ollama

TraceMark can ask a local Ollama service to summarize, explain, suggest tags for, or create an overview of selected saved quotations. This feature is disabled by default. TraceMark does not install Ollama, download models, start the service, or contact a cloud service.

## Prerequisites

- Install Ollama and make sure its local service is running.
- Pull the model you plan to use; TraceMark’s default model name is `llama3.2`.
- Have one to twenty saved quotations visible in **Research library** and ready to select.

For example, after installing Ollama, you can prepare the default model with:

```sh
ollama pull llama3.2
```

If another Ollama process is not already serving requests, `ollama serve` starts the local server.

## Enable Local AI

1. In the library’s **Local AI** panel, check or enter the **Ollama model** name.
2. Choose **Enable local AI** and approve the browser permission prompt for `127.0.0.1:11434`.
3. In Firefox, approve the first data-consent prompt, then choose **Continue enabling local AI** and approve the separate loopback-origin prompt.

Expected result: the panel changes to **Enabled** and says to select research before requesting assistance. The permission lets TraceMark reach only the Ollama loopback endpoint; it does not grant access to arbitrary websites.

For each requested action, TraceMark sends only the selected saved fields: the internal highlight ID, quotation, title, source URL, tags, and note. It sends them over local loopback HTTP to Ollama’s chat API. Loopback traffic remains on the device but is not encrypted; Ollama, its models, and other local software are separate components you should trust deliberately.

## Request assistance

Select the checkbox on one or more quotation cards (up to 20). Then choose one action: **Summarize**, **Explain**, **Suggest tags**, or **Overview**. The output appears in the panel and is saved with the library. Suggested tags are informational; TraceMark does not apply them automatically.

If the panel reports that the model is unavailable, pull or select the stated Ollama model and confirm the service is running. If it reports that Local AI is unavailable, check Ollama’s local service. A request that takes too long fails rather than waiting indefinitely.

## Disable and recover permission cleanup

Choose **Disable local AI** to store the disabled setting and remove the optional browser permissions. If cleanup cannot be completed, TraceMark blocks re-enabling and displays **Retry permission removal**. Use that control after checking browser extension permissions; the browser’s settings are authoritative for inspecting or revoking permission. TraceMark also disables the feature before sending a request when it can no longer verify the required grants.

For the broader local-data and trust model, see the [privacy policy](../../PRIVACY.md).
