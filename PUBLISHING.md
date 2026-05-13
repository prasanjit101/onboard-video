# Publishing `onboard-video`

Step-by-step guide for getting this package on npm and making it available to consumers worldwide. Read all of it once before you publish the first time — most of these steps you do exactly once.

> **Day-to-day flow lives elsewhere.** Versioning, changelog generation, and publishing are managed by [Changesets](https://github.com/changesets/changesets) and a GitHub Action — see sections 3–5 below for what that looks like in practice. If you're using Claude Code in this repo, the `.claude/skills/release/SKILL.md` skill walks the model through the workflow end-to-end. This file is mostly the one-time account-setup background.

---

## 1. One-time setup

### 1.1 Pick the package name

`onboard-video` is the working name. Before you publish, check that it's still available:

```sh
npm view onboard-video
```

- If you see `404 Not Found`, the name is free.
- If a package already owns it, change `name` in `package.json` to something free. Common patterns:
  - Scoped name you own: `@your-org/onboard-video`
  - Renamed: `react-onboard-video`, `onboard-video-react`, etc.

Whichever you pick, that's the name consumers will install with (`npm install <name>`).

### 1.2 Create an npm account and log in

If you don't have one yet:

```sh
npm adduser
# or, if you already have an account:
npm login
```

This stores an auth token in `~/.npmrc`. Verify with:

```sh
npm whoami
```

If you'll be publishing under an org scope (`@your-org/...`), also:

```sh
npm org ls your-org    # confirms you're a member
```

### 1.3 (Recommended) Turn on 2FA for publishes

Either via the npm website (Account → Two-Factor Authentication) or:

```sh
npm profile enable-2fa auth-and-writes
```

With 2FA on, every publish prompts for an OTP. This is the single most effective protection against a compromised token publishing malware under your name.

### 1.4 Fill in the package metadata

Open `package.json` and update:

- `name` — the name you chose in 1.1
- `version` — start at `0.1.0` for a beta or `1.0.0` if you're confident the API is stable
- `description` — one short sentence
- `author` — `"Your Name <you@example.com>"`
- `repository.url` — e.g. `"git+https://github.com/your-org/onboard-video.git"`
- `homepage` — usually the README URL or a docs site
- `bugs.url` — the issues page
- `license` — `MIT` is already set; change if you want something different

The `LICENSE` file is already MIT — update the copyright line if needed.

### 1.5 (If using a scoped name) Make it public

Scoped packages default to private. To publish a `@your-org/onboard-video` package publicly, either:

- Pass `--access public` on every `npm publish`, or
- Add this to `package.json` so you can't forget:
  ```json
  "publishConfig": { "access": "public" }
  ```

Unscoped names (`onboard-video`) are public by default — no extra flag needed.

---

## 2. Pre-flight checks

Run this every time before publishing.

### 2.1 Clean install and verify

```sh
rm -rf node_modules dist
bun install
bun test
bun run typecheck
bun run build
```

All four must pass. The `prepublishOnly` script in `package.json` runs `clean + test + build` automatically when you publish, but running them manually first means you see failures *before* npm has marked a version.

### 2.2 Verify the bundle sizes (spec requires <6 KB / <3 KB gzipped)

```sh
bun run size
```

The spec budgets are:
- Core ESM bundle: **< 6 KB gzipped** (includes the optional draggable/floating mode)
- YouTube chunk: **< 3 KB gzipped** (excluding `lite-youtube-embed` itself)

If you're over, audit `dist/esm/index.js` for unexpected code being pulled in by imports.

### 2.3 Preview exactly what will be published

`npm pack --dry-run` prints the tarball contents without uploading anything. Look for:

- ✅ `dist/esm/index.js`, `dist/cjs/index.cjs`, `dist/types/index.d.ts`
- ✅ `README.md`, `LICENSE`, `package.json`
- ❌ No `src/`, `tests/`, `node_modules/`, `spec.md`, or `.DS_Store`

```sh
npm pack --dry-run
```

If extra files leak in, tighten `.npmignore` or use the `files` array in `package.json` (which is already set — it whitelists `dist`, `README.md`, `LICENSE`).

### 2.4 Smoke-test the actual tarball locally

Create the tarball and install it into a scratch project:

```sh
npm pack                                # produces onboard-video-0.1.0.tgz
mkdir /tmp/onboard-smoke && cd /tmp/onboard-smoke
bun init -y
bun add react react-dom
bun add /path/to/onboard-video-0.1.0.tgz
```

Then write a tiny `index.tsx` that imports and renders the component. If `bun build` (or `tsc`) succeeds and the demo works, you're clear to publish.

---

## 3. Versioning and the changelog (via Changesets)

This project uses [Changesets](https://github.com/changesets/changesets) for versioning. The model:

> Every PR that affects consumers drops a small markdown file into `.changeset/` describing the change and the bump type (`patch` / `minor` / `major`). Those files queue up. When you "cut a release", Changesets consumes the queue: it bumps `package.json`, writes/updates `CHANGELOG.md`, deletes the consumed files, and publishes to npm.

### 3.1 Record a change (per PR)

After making a user-visible change, in the PR branch:

```sh
bun run changeset
```

You'll be prompted for the bump type and a summary. The summary becomes the `CHANGELOG.md` entry verbatim — write it for consumers reading release notes, not as a commit log. Commit the generated `.changeset/<random-name>.md` alongside the code.

Semver guide:

- **Patch** (`0.1.0 → 0.1.1`) — bug fixes, no API change
- **Minor** (`0.1.0 → 0.2.0`) — backwards-compatible new features
- **Major** (`0.1.0 → 1.0.0`) — breaking API change (lead the summary with `BREAKING:` and include a one-line migration hint)

Skip the changeset for docs-only, test-only, internal-refactor, or CI changes.

### 3.2 Pre-release versions

```sh
bunx changeset pre enter beta    # enter pre-release mode tagged "beta"
bun run changeset                # add changesets as usual
bun run version                  # produces e.g. 0.2.0-beta.0
bun run release                  # publishes under the "beta" dist-tag
bunx changeset pre exit          # leave pre-release mode when done
```

Consumers opt in with `npm install onboard-video@beta`. The `latest` tag is unaffected.

### 3.3 Inspect what's queued

```sh
bunx changeset status --verbose
```

Prints each pending changeset, the bump type, and the projected next version.

---

## 4. Publishing

### 4.1 First publish (one-time bootstrap)

The first publish has to happen by hand, because Changesets needs a starting point on the registry:

```sh
bun run build
npm publish
```

You'll be prompted for your 2FA code if you enabled it. After ~20 seconds the package is live. Verify:

```sh
npm view onboard-video
```

From here on, all subsequent versions are cut by Changesets — either via the GitHub Action (recommended) or manually.

### 4.2 Subsequent publishes via CI (recommended)

When `.changeset/*.md` files exist on `main`, the `Release` GitHub Action opens (or updates) a PR titled **"release: version packages"** that bumps `package.json`, writes the changelog, and deletes the consumed changeset files. **Merge that PR** to publish — the workflow detects the merged version bump and runs `bun run release` (which calls `changeset publish` → `npm publish` → also pushes a `v<x.y.z>` git tag).

See section 5 for setup.

### 4.3 Subsequent publishes manually (fallback)

Use only when CI is unavailable or you need a hotfix out *right now*.

```sh
bun run version             # consumes .changeset/*.md → bumps package.json + CHANGELOG.md
git diff                    # sanity-check the version bump and changelog
git add CHANGELOG.md package.json .changeset
git commit -m "release: v$(node -p "require('./package.json').version")"
bun run release             # prepublishOnly runs clean+test+build, then npm publish
git push --follow-tags
```

You **cannot** republish the same version number — even if you `npm unpublish` it, npm forbids reuse for 24 hours. Always bump the version.

---

## 5. Automated publishing via GitHub Actions

`.github/workflows/release.yml` is already set up and uses [`changesets/action@v1`](https://github.com/changesets/action). On every push to `main` it does one of two things:

- **If queued changesets exist** → opens / updates a PR called **"release: version packages"** containing the version bump and changelog updates.
- **If `package.json` is ahead of npm** (i.e. someone merged the Version PR) → runs `bun run release`, which publishes to npm and pushes the git tag.

You don't have to invoke it — pushing to `main` (or merging the Version PR) is the trigger.

### 5.1 One-time setup

1. Generate an **automation token** on npmjs.com (Account → Access Tokens → Generate New Token → "Automation"). Automation tokens bypass 2FA, so guard them.
2. Add it to your repo as a secret named `NPM_TOKEN` (Settings → Secrets and variables → Actions → New repository secret).
3. Make sure Settings → Actions → General → "Workflow permissions" allows the workflow to "create and approve pull requests" (needed so the action can open the Version PR).

The workflow already has the right permissions block (`contents: write`, `pull-requests: write`, `id-token: write`) and passes `NPM_CONFIG_PROVENANCE=true` so published tarballs are signed with cryptographic provenance from this commit. Consumers can verify with `npm audit signatures`.

---

## 6. After publishing

### 6.1 Tell people

- Add the badge to `README.md`:
  ```md
  [![npm](https://img.shields.io/npm/v/onboard-video.svg)](https://www.npmjs.com/package/onboard-video)
  [![bundle size](https://img.shields.io/bundlephobia/minzip/onboard-video)](https://bundlephobia.com/package/onboard-video)
  ```
- Cut a GitHub Release from the tag with release notes. Easiest: `gh release create v0.1.0 --generate-notes`.
- Post in the relevant places — Twitter/X, Bluesky, the React subreddit, the Cloudinary developer forum, etc.

### 6.2 Set up dependabot / renovate

Add `.github/dependabot.yml` so React, TypeScript, and the dev tools stay current:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule: { interval: "weekly" }
```

### 6.3 Changelog

`CHANGELOG.md` is generated automatically by Changesets when `bun run version` runs (locally or in the Version PR). Don't edit it by hand — edit the source `.changeset/*.md` and re-run `version`.

---

## 7. Mistakes to roll back

### Unpublishing (only within 72 hours)

```sh
npm unpublish onboard-video@0.1.0
```

After 72 hours, npm refuses to unpublish without manual intervention. Deprecate instead:

```sh
npm deprecate onboard-video@0.1.0 "Use 0.1.1 — fixes a regression in autoplay"
```

The package stays installable but consumers see the message in their install logs.

### Stolen token

1. Rotate immediately on npmjs.com (Access Tokens → Revoke).
2. `npm deprecate` any version that may have been tampered with.
3. Publish a clean version with 2FA active.

---

## 8. Quick reference

```sh
# First time only:
npm login
npm whoami
bun run build && npm publish     # bootstrap the package on the registry

# Per PR (records what changed for the next release):
bun run changeset                # interactive: pick bump type + summary
git add .changeset/*.md          # commit alongside the code change

# Inspecting:
bunx changeset status --verbose  # what's queued for the next release
npm pack --dry-run               # what would actually be uploaded
npm view onboard-video           # what's currently on npm

# Releasing via CI (recommended):
# 1. Push the PR with the changeset to main.
# 2. The "Release" workflow opens a "release: version packages" PR.
# 3. Merge it. The workflow publishes to npm and pushes the v<x.y.z> tag.

# Releasing manually (fallback):
bun run version                  # consume changesets, bump version, write CHANGELOG.md
git commit -am "release: v$(node -p "require('./package.json').version")"
bun run release                  # publish to npm (prepublishOnly runs clean+test+build)
git push --follow-tags
```

That's it. The package will be installable globally as `npm install onboard-video` (or whatever name you picked) within minutes of publish completing.
