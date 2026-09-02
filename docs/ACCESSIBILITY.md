# Accessibility

TraceMark is designed around native browser controls and semantic HTML, but it does not claim a
formal WCAG conformance level. Chrome presents the library in a side panel and Firefox presents it
in a sidebar; browser chrome, operating system settings, assistive technology, and browser version
affect the final experience. This document separates implementation and test evidence from advice
that users may find helpful.

## Implemented interface behavior

The capture popup and research library use native `button`, `input`, `select`, `textarea`, form,
label, and link elements. Search has a search role and labelled search input; collection and tag
filters have labels; each quotation-selection checkbox and edit control has an accessible name.
The library groups related controls with labelled sections, including collections, saved quotations,
and local-AI actions.

Important state changes are exposed in the markup: ordinary progress and result counts use status
regions, while errors and destructive confirmations use alert roles. Dialogs use native `dialog`
elements with accessible names. The edit dialog receives focus on its Collection control when it
opens, supports `Escape` to close, and returns focus to the control that opened it. Buttons and
form controls expose a visible `:focus-visible` outline; disabled controls remain visually
distinguished.

The UI provides system, light, and dark theme preferences. Its layout includes a narrow-width rule
for the panel, and motion is only applied under `prefers-reduced-motion: no-preference`. Saved page
text, notes, tags, and AI output are displayed through Svelte text interpolation rather than HTML
insertion, so text that resembles markup remains text instead of becoming interactive page content.

## Tested evidence

The component tests verify labelled, keyboard-accessible search and edit controls; focus entering
and returning from the edit dialog; escape-to-close behavior; role-based alert rendering; and
literal rendering of hostile-looking saved text. A source-level UI guard verifies that the library
contains visible-focus styling, native modal use, a narrow-panel rule, theme support,
reduced-motion gating, and no `{@html}` or `innerHTML` usage. Packaged Chromium and Firefox tests
exercise the library in normal extension-page tabs and verify inert rendering, but they do not test
the native Chrome side-panel chrome or Firefox sidebar chrome. The native-browser manual checks
remain pending, as documented in [TESTING.md](TESTING.md).

These tests are useful regression evidence, not a screen-reader audit, automated accessibility
scan, color-contrast measurement, or certification. In particular, no formal assessment is
recorded for screen-reader announcements, high-zoom/reflow behavior in native panel chrome,
keyboard traversal across every dialog, or browser-specific permission prompts.

## Practical use and workarounds

Use the keyboard to move through native controls, and rely on the visible focus ring to identify
the active control. If the narrow library panel is difficult to work in, open the research library
in its normal extension page where available (the popup’s **Open research library** link does so),
or adjust the browser’s zoom and operating-system display settings. Select **System** theme to
follow system color preferences, or explicitly select Light/Dark where it improves readability.

Browser permission prompts and extension toolbar/context-menu surfaces are controlled by the
browser, not TraceMark. If a gesture-driven action is difficult to invoke, the `Alt+Shift+S`
command provides a keyboard capture route. TraceMark may be unavailable on protected browser pages
regardless of input method. Report an observed accessibility issue with browser, OS, and the
surface used (popup, library page, side panel, or sidebar), while omitting sensitive research.
