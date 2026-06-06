---
name: release
description: Use whenever the user wants to ship a new version, publish to npm, record a change, add a changeset, bump the version, cut a release, update CHANGELOG.md, or ask "what's queued for the next release". Triggers on phrases like "release", "publish", "ship it", "cut a version", "bump version", "add a changeset", "I just fixed X, record it", "what's in the next release", "tag a release", "rollback", "beta release". Walks through this project's Changesets-based release flow for the `onboard-video` npm package.
---

# Release workflow for `onboard-video`

This project uses [Changesets](https://github.com/changesets/changesets) to manage versions, the changelog, and npm publishing. The day-to-day mental model is simple:

> Every PR that changes user-visible behavior drops a small markdown file into `.changeset/`. Those files queue up. When you "cut a release", Changesets consumes them: it bumps `package.json`, writes/updates `CHANGELOG.md`, deletes the consumed files, and publishes to npm.

A GitHub Action wires this up so the release itself is a merged PR, not a manual command.

## Source of truth for the package layout

- Single package, not a monorepo. The only package is `onboard-video` in the repo root.
- npm package name: `onboard-video` (public, unscoped).
- GitHub repo: `prasanjit101/onboard-video`, default branch `main`.
- Config: `.changeset/config.json` (`access: public`, `baseBranch: main`).
- Pre-flight is wired through `prepublishOnly` (clean + test + build) — `changeset publish` triggers it automatically.
- Size budgets the spec requires: core ESM < 4 KB gzipped, YouTube chunk < 3 KB gzipped. `bun run size` enforces this.

## Decide which workflow you're in

Listen for what the user actually wants. The three common modes:

| Intent | What to do |
|---|---|
| "I just changed X, record it for the next release" | **Workflow A — Record a change** |
| "Ship what's queued" (and CI is set up) | **Workflow B — Release via CI** (preferred) |
| "Ship what's queued from my laptop right now" | **Workflow C — Release manually** |

When in doubt, ask which one. The cost of guessing wrong (e.g. publishing manually when CI is supposed to own releases) is non-trivial — a version gets cut on the wrong commit.

---

## Workflow A — Record a change (per PR)

Run when the user has just made (or is about to commit) a user-visible change: new feature, bug fix, breaking change, dependency bump that affects consumers. Skip for changes that don't affect the published package (docs, tests, internal refactors, CI).

```sh
bun run changeset
```

The CLI prompts:
1. **Bump type** — pick one (semver):
   - `patch` → bug fix, no API change (`0.1.0 → 0.1.1`)
   - `minor` → backwards-compatible feature (`0.1.0 → 0.2.0`)
   - `major` → breaking change (`0.1.0 → 1.0.0`)
2. **Summary** — this becomes the `CHANGELOG.md` entry verbatim. Write it for *consumers reading the changelog*, not for the commit log.

### Writing a good changeset summary

The summary is the user-facing release note. Keep it specific, framed around what *changed for the caller*.

**Good:**
- `Add 'autoplay' prop to <OnboardVideo>; defaults to false to preserve previous behavior.`
- `Fix YouTube provider: poster image no longer flashes when the iframe finishes loading.`
- `BREAKING: rename 'src' prop to 'source' to disambiguate from native video.src. Migration: rename the prop on every call site.`

**Bad:**
- `Fix bug` (no signal)
- `Updates per review feedback` (refers to review, not the change)
- `Add prop to component` (which prop, which component, what does it do?)

For a `major` bump, lead with `BREAKING:` and include a one-line migration hint. Consumers grep changelogs for that word.

### After the prompt

A file lands at `.changeset/<random-name>.md` (e.g. `.changeset/quick-tigers-yawn.md`). Commit it alongside the code change:

```sh
git add .changeset/*.md path/to/changed/files
git commit -m "<your commit message>"
```

The changeset travels with the PR and gets consumed at release time.

### Multiple changes in one PR

It's fine to add multiple changesets in one PR (run `bun run changeset` multiple times). Each becomes its own changelog entry. Prefer this over cramming several unrelated changes into one summary — readers scan the changelog by line.

### Empty changeset (intentionally skipping)

If a PR really has no consumer impact and you want to be explicit:

```sh
bun run changeset --empty
```

This commits a marker file so the release tooling doesn't complain. Use sparingly; most "no impact" PRs just need no changeset at all.

---

## Workflow B — Release via CI (preferred)

Once changesets accumulate on `main`, the GitHub Action at `.github/workflows/release.yml` opens (or updates) a PR titled **"Version Packages"** that:
- Bumps `package.json` version based on the highest queued bump type
- Consumes all `.changeset/*.md` files into `CHANGELOG.md`
- Deletes the consumed changeset files

To ship:

1. Review the auto-opened **Version Packages** PR. Check that the proposed version bump and changelog match expectations.
2. Merge it.
3. The same workflow detects the merged version bump, runs `bun install && bun test && bun run build`, then runs `changeset publish` — which calls `npm publish` for the new version and pushes a git tag `v<x.y.z>`.

**Pushes with nothing to release are a harmless no-op.** If `main` has zero queued changesets *and* `package.json`'s version is already on npm (e.g. you just published manually from your laptop and then pushed the version-bump commit), the action runs, finds nothing to do, and exits green. No Version PR opens; no republish. Don't second-guess an empty successful run — that's the expected state between releases.

If the publish step is failing, check:
- `NPM_TOKEN` secret is present in repo settings (Automation token from npmjs.com).
- 2FA: Automation tokens bypass 2FA, but Publish tokens don't. If you're seeing OTP prompts in CI, the secret is the wrong token type. The same applies locally — `bun run release` from a laptop with a Publish-token-enabled account will prompt for OTP; pass `--otp=<code>` via `npm publish --tag beta --otp=…` or switch to an Automation token.
- The version in `package.json` isn't already published to npm (`npm view onboard-video versions`).

---

## Workflow C — Release manually (laptop)

Use only when CI is unavailable or you've explicitly chosen to bypass it (e.g. a hotfix that needs to ship now). Otherwise prefer Workflow B.

```sh
# 1. Consume queued changesets: bumps package.json + writes CHANGELOG.md
bun run version

# 2. Inspect the diff. Is the version bump correct? Does CHANGELOG.md read well?
git diff

# 3. Commit the version bump (CHANGELOG.md, package.json, deleted .changeset/*.md)
git add CHANGELOG.md package.json .changeset
git commit -m "release: v$(node -p "require('./package.json').version")"

# 4. Publish — runs `prepublishOnly` (clean + test + build) then `npm publish` for each package
bun run release

# 5. Push commit + tags
git push --follow-tags
```

`bun run release` calls `changeset publish`, which under the hood:
- Reads versions from `package.json`
- Compares against what's on npm
- Runs `npm publish` for anything new
- Creates a git tag `v<x.y.z>` per published package

If `npm whoami` returns nothing, run `npm login` first.

---

## Pre-release / beta versions

For shipping a beta out of `main` (or any branch) without consumers on the default `latest` tag being affected:

```sh
# Enter pre-release mode tagged "beta"
bunx changeset pre enter beta

# Add changesets as usual
bun run changeset

# Version + publish — produces e.g. 0.2.0-beta.0, published under the "beta" dist-tag
bun run version
bun run release

# When done, exit pre-release mode
bunx changeset pre exit
```

Consumers opt in with `npm install onboard-video@beta`. The `latest` tag is untouched — **except on the very first publish of the package**.

> **First-publish dist-tag gotcha.** npm always seeds a `latest` tag on a brand-new package, even when you pass `--tag beta`. So if `0.2.0-beta.0` is the *first ever* version published, `latest` and `beta` will both point at it, and a bare `npm install onboard-video` will pull the beta. Two ways to recover:
> - **Preferred:** publish a stable version next (`bunx changeset pre exit` → `bun run version` → `bun run release`). That stable version takes over `latest`, and `@beta` becomes opt-in as intended.
> - **Quick fix:** point `latest` at a different existing version with `npm dist-tag add onboard-video@<stable> latest`. (There's no "remove latest" — npm requires the tag to exist.)
>
> Every subsequent publish respects `--tag` normally; the gotcha only fires on the package's first-ever version.

While in pre-release mode, all subsequent `bun run version` calls bump the pre-release counter (`-beta.0` → `-beta.1`) until you exit.

---

## Answering "what's queued for the next release?"

```sh
bunx changeset status --verbose
```

Prints each pending changeset, the bump type, and the projected next version. Useful before deciding whether to ship now or wait.

For a dry-run of the changelog that *would* be written, you can run `bun run version` in a clean working tree, eyeball `CHANGELOG.md`, and then `git restore .` to revert (no commit needed).

---

## Rolling back / mistakes

**Published the wrong thing within 72 hours:**
```sh
npm unpublish onboard-video@<bad-version>
```
After 72 hours npm refuses; use `npm deprecate onboard-video@<bad-version> "<reason>"` instead. The package stays installable but consumers see the warning at install time.

**The Version Packages PR has a wrong entry:**
Don't edit `CHANGELOG.md` directly in that PR — the entry came from a `.changeset/*.md` file on `main`. Instead, open a follow-up PR that edits or deletes the offending `.changeset/*.md` on `main`. The Version Packages PR will refresh automatically.

**Already merged a release with the wrong version bump:**
You can't unpublish after 72 hours. The least-bad fix is publishing a new patch with a changeset that explains the correction.

---

## When *not* to add a changeset

- Pure documentation changes (`README.md`, code comments, this skill, `PUBLISHING.md`)
- Test-only changes
- CI / tooling changes (`bunfig.toml`, `.github/`, `tsconfig.*`)
- Internal refactors with no observable consumer behavior change

If unsure, lean toward adding one — a `patch` with `"Internal refactor of provider selection logic (no observable change)."` is cheap and gives consumers context if something does regress.

---

## Pre-flight checklist (before merging Version Packages PR)

CI runs these, but if you're shipping manually or want a sanity check first:

```sh
bun install
bun test
bun run typecheck
bun run build
bun run size       # enforces ESM < 4 KB / YouTube chunk < 3 KB gzipped
npm pack --dry-run # confirm dist/, README.md, LICENSE only; no src/, tests/, spec.md
```

The first time you smoke-test the tarball end-to-end, follow `PUBLISHING.md` section 2.4.

---

## File map

- `.changeset/config.json` — Changesets config. `access: public`, `baseBranch: main`.
- `.changeset/*.md` — Queued changesets (each one a future changelog entry). Committed; not gitignored.
- `.changeset/README.md` — Changesets' own readme; safe to leave alone.
- `CHANGELOG.md` — Auto-generated on `bun run version`. Don't edit by hand; edit the source changeset and re-run `version`.
- `.github/workflows/release.yml` — Opens Version Packages PRs and publishes on merge. Needs `NPM_TOKEN` secret.
- `PUBLISHING.md` — Background reading for one-time npm setup (account, 2FA, scoped names). Day-to-day flow lives here in this skill.

## Reference

- Changesets docs: https://github.com/changesets/changesets
- The GitHub Action: https://github.com/changesets/action
- This project's `PUBLISHING.md` for one-time setup (npm account, tokens, 2FA)
