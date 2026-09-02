# Reproducible builds

TraceMark uses a committed pnpm lockfile and scripted WXT packaging so a reviewed source commit can
produce identifiable browser artifacts. Reproducibility is an observed property of a defined
environment, not a guarantee from having a lockfile alone.

## Record the environment

Capture the commit SHA, operating system and architecture, Node.js version, pnpm version, package
manager configuration that affects resolution, and the absence of untracked source inputs. Use a
fresh checkout or verify the working tree is clean. Install with:

```sh
pnpm install --frozen-lockfile
pnpm check
```

The full gate produces the expected Chrome and Firefox ZIPs and `SHA256SUMS`. Preserve command output
and archive listings with the hashes. Do not commit `.output/` or dependency directories.

## Compare builds

Build twice from the same commit and environment after removing prior generated output through a
safe, explicit path. Compare the two executable browser ZIP hashes and, when they differ, compare
archive filenames, order, timestamps, compression metadata, and uncompressed contents before
assuming product code changed.

Cross-environment byte identity can be affected by the operating system, runtime, archive utility,
bundler, or transitive tooling even when runtime behavior is equivalent. Record the boundary of the
comparison rather than describing one successful local repeat as universal reproducibility.

The Firefox source-review ZIP includes repository documentation and source. A documentation-only
commit can legitimately change that archive while leaving the Chrome and Firefox executable ZIPs
byte-for-byte identical.

## Investigate drift

Check lockfile changes, generated manifest order, build timestamps, nondeterministic asset content,
plugin versions, environment variables, locale, and unexpected files. Any unexplained executable
artifact change is a release stop condition. Complete the inventory and permission review in
[PACKAGE_AUDIT.md](PACKAGE_AUDIT.md) before publication.
