# Publishing `onboard-video`

Step-by-step guide for getting this package on npm and making it available to consumers worldwide. Read all of it once before you publish the first time — most of these steps you do exactly once.

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

### 2.2 Verify the bundle sizes (spec requires <4 KB / <3 KB gzipped)

```sh
bun run size
```

The spec budgets are:
- Core ESM bundle: **< 4 KB gzipped**
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

## 3. Versioning

Follow [semver](https://semver.org/):

- **Patch** (`0.1.0 → 0.1.1`) — bug fixes, no API change
- **Minor** (`0.1.0 → 0.2.0`) — backwards-compatible new features
- **Major** (`0.1.0 → 1.0.0`) — breaking API change

Bump the version with npm itself, which also creates a git tag:

```sh
npm version patch        # 0.1.0 → 0.1.1
npm version minor        # 0.1.0 → 0.2.0
npm version major        # 0.1.0 → 1.0.0
```

Push the tag:

```sh
git push --follow-tags
```

### Pre-release versions

For betas / release candidates:

```sh
npm version prerelease --preid=beta    # 0.1.0 → 0.1.1-beta.0
npm publish --tag beta
```

Consumers then opt in with `npm install onboard-video@beta`. The default `latest` tag is unaffected.

---

## 4. Publishing

### 4.1 First publish

```sh
npm publish
```

(For a scoped package without `publishConfig`: `npm publish --access public`.)

You'll be prompted for your 2FA code if you enabled it. After ~20 seconds the package is live.

Verify:

```sh
npm view onboard-video
```

You should see the version, the README, and the dist files listed.

### 4.2 Subsequent publishes

```sh
npm version patch      # or minor / major
npm publish
git push --follow-tags
```

You **cannot** republish the same version number — even if you `npm unpublish` it, npm forbids reuse for 24 hours. Always bump the version.

---

## 5. Automated publishing via GitHub Actions (recommended)

Manual publishing works fine for v1, but automating it from a git tag prevents "I forgot to run the tests" mistakes.

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: read
  id-token: write       # required for npm provenance (see below)

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: bun install --frozen-lockfile
      - run: bun test
      - run: bun run build
      - run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Then:

1. Generate an **automation token** on npmjs.com (Account → Access Tokens → Generate New Token → "Automation"). Automation tokens bypass 2FA, so guard them.
2. Add it to your repo as a secret named `NPM_TOKEN` (Settings → Secrets and variables → Actions → New repository secret).
3. To release, just run `npm version patch && git push --follow-tags`. The workflow fires on the tag.

**`--provenance`** signs the published package with cryptographic proof it came from this GitHub repo at this commit. Consumers can verify with `npm audit signatures`. Strongly recommended.

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

### 6.3 Add a changelog

Even a hand-written `CHANGELOG.md` (Keep-a-Changelog format) helps consumers know what changed between versions. Or use `changesets` if you want to automate it.

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
# First time:
npm login
npm whoami

# Each release:
bun install
bun test
bun run build
npm version patch         # or minor / major
npm publish               # --access public if scoped
git push --follow-tags

# Inspect:
npm pack --dry-run
npm view onboard-video
```

That's it. The package will be installable globally as `npm install onboard-video` (or whatever name you picked) within minutes of `npm publish` completing.
