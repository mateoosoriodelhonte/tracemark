# Accessibility review

Accessibility review covers the popup, full extension page, Chrome side panel, Firefox sidebar,
dialogs, status messages, and browser-owned prompts that participate in a workflow. Automated tests
are regression evidence, not a conformance claim.

## Keyboard and focus

Complete the changed workflow without a pointer. Confirm controls follow a sensible order, visible
focus is not clipped, native buttons and links activate normally, `Escape` closes dismissible modal
UI, and focus returns to the control that opened it. Test destructive confirmation, validation
failure, loading, empty, disabled, and permission-denied states—not only the successful path.

## Names, roles, and state

Inspect semantic elements and accessible names. A control's label should identify its object and
action without relying on nearby visual position. Use status regions for ordinary progress and
results, alerts for important errors, and native dialog semantics for modal interactions. Dynamic
state must remain understandable without color, animation, or an icon alone.

## Layout and presentation

Check light, dark, and system themes; narrow native panel widths; browser zoom; long quotations and
tags; enlarged text; reduced-motion preference; and common operating-system contrast settings.
Ensure saved webpage text and AI output stay inert and cannot introduce focusable markup.

## Evidence

Add focused component tests for semantic behavior and focus management. Use packaged-browser checks
for real extension pages, then manually inspect Chrome's side panel and Firefox's sidebar because a
normal tab does not reproduce their chrome or width constraints. Record the assistive technology,
browser, OS, zoom, and exact workflow when a screen-reader or high-zoom observation is made.

Update [ACCESSIBILITY.md](../ACCESSIBILITY.md) with implemented evidence and known gaps. Do not claim
a WCAG level or screen-reader certification without a documented assessment supporting it.
