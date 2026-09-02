# Documentation style

TraceMark documentation should help a reader distinguish implemented behavior, tested evidence,
manual observations, and future intent. Write for the smallest audience that can act on the page:
users, contributors, reviewers, or release maintainers.

## Voice and structure

- Lead with the task, contract, or limitation the page exists to explain.
- Use direct language, short sections, and the exact labels shown in the interface.
- Describe current behavior in the present tense. Reserve future tense for an explicitly identified
  proposal or roadmap item.
- Expand an acronym on first use and prefer project terms from the
  [glossary](../reference/GLOSSARY.md).
- Use relative links for tracked repository documents and descriptive text for external links.

Do not present an automated test as proof of browser-owned UI. Name the tested layer and record
manual Chrome or Firefox evidence separately. Avoid absolute privacy or security claims: state the
boundary, trigger, transmitted fields, and known limitation instead.

## Commands, paths, and data

Use fenced `sh`, `json`, or other language-specific blocks for executable examples. Commands should
work from the repository root unless the surrounding text says otherwise. Use current package
scripts instead of reproducing long internal command pipelines.

Examples, screenshots, fixtures, and logs must use synthetic research. Remove personal paths,
tokens, browsing data, local model prompts, and quotation content before publishing evidence. Do
not place vulnerability reproduction details in public documentation.

## Keeping pages correct

When behavior changes, search for the user-facing label, API name, permission, and old limitation
across Markdown, issue templates, store copy, and tests. Update the narrow authoritative page first,
then link to it rather than duplicating its entire contract.

Run these checks for documentation-only work:

```sh
pnpm exec prettier --check '**/*.md'
pnpm docs:links
git diff --check
```

Run `pnpm check` before merge. The full gate catches documentation drift that interacts with package
inventory, screenshots, formatting, or tracked-source policy.
