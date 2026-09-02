# User gestures and page access

TraceMark intentionally ties webpage access to browser-recognized user actions. It has no static
content scripts and no standing host permissions.

## Qualifying routes

- Clicking the TraceMark toolbar action on the active tab opens the reviewed capture flow.
- Choosing **Save selection to TraceMark** from the selection context menu captures directly to
  Inbox.
- Pressing `Alt+Shift+S` invokes the configured **Save selected text to TraceMark** command and
  captures directly to Inbox.

These routes let the browser grant temporary `activeTab` access to the selected page. The exact
lifetime is browser-controlled; it is not permanent access to the site or browsing history.

## What is not a page grant

Opening the research library, clicking **Open source**, visiting an extension URL, or starting a
background task does not independently grant access to an ordinary webpage. On a fresh source tab,
TraceMark may ask the user to invoke its toolbar action or command on that tab before retrying
**Mark on page**.

## Runtime injection

After a qualifying route, the background controller uses the `scripting` permission to inject the
capture or anchor script into the active main frame. The script returns structured data through an
extension message. Message and result schemas are validated before privileged code uses them.

The browser can still refuse injection on protected pages. TraceMark reports that limitation rather
than requesting broad persistent access.

## Review implications

Unit tests can verify call order and fail-closed behavior, but only native-browser observation proves
that a toolbar action, context menu, shortcut, or permission prompt is accepted and displayed as
expected. Record those checks separately from extension-page automation.

See [../PERMISSIONS.md](../PERMISSIONS.md) and [BROWSER_COMPATIBILITY.md](BROWSER_COMPATIBILITY.md).
