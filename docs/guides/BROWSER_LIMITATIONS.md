# Browser limitations

Some TraceMark behavior depends on browser security rules and native extension surfaces. These
limits are expected constraints, not reasons to request standing access to every website.

## Restricted pages

Browsers can reject extension script injection on internal settings, extension stores, privileged
pages, and browser-owned PDF viewers. Capture and **Mark on page** may therefore be unavailable even
after a toolbar or keyboard gesture. Open the material on an ordinary HTTP(S) webpage when a safe
alternative exists.

## Temporary page access

TraceMark uses `activeTab` rather than static host permissions or persistent content scripts. A
qualifying toolbar, selection-context-menu, or command gesture grants temporary access to the
active page. Opening the library does not grant access to another tab. On a fresh source tab, invoke
the toolbar action or `Alt+Shift+S`, then retry **Mark on page**.

## Exact anchoring

TraceMark marks only one exact, context-supported match. It refuses to guess when text is absent,
changed, or still duplicated after considering saved context. A successful mark is a runtime page
annotation and disappears when the page reloads; TraceMark does not alter the website.

## Native Chrome and Firefox surfaces

Chrome presents the library through a side panel; Firefox uses a sidebar. Firefox temporary add-ons
are removed on restart, and its Local AI enable flow includes separate optional data-consent and
origin steps. Browser prompts, shortcuts, toolbar placement, and native panel accessibility can
vary by browser version and operating system.

The released Firefox archive is unsigned, and neither browser store currently lists TraceMark.
Current automated and manual evidence boundaries are recorded in [TESTING.md](../TESTING.md) and
[BROWSER_COMPATIBILITY.md](../reference/BROWSER_COMPATIBILITY.md).
