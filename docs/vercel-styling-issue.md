# Vercel Styling Regression Fix (October 31, 2025)

This note documents why the Vercel deployment of **Mindful Breath** lost its Tailwind/Frosted UI styling and what we changed to fix it.

## Symptoms
- Production page at `mindfulness-breath.vercel.app` rendered as plain black page with unstyled text and default button styles.
- Page source showed only `/_next/static/css/de70bee13400563f.css` (fonts) being loaded; the Tailwind bundle was missing.

## Root Cause
- The project relied on `@import "@whop/react/styles.css"` inside `app/globals.css`.
- Vercel builds run `pnpm install` with build scripts blocked by default; the `@whop/react` postinstall script that should copy `styles.css` never executed.
- Without that file, the import failed, Tailwind layers were skipped during build, and Next.js produced no utility CSS.

## Fix
1. Added `scripts/ensure-frosted-styles.mjs`, a postinstall helper that:
   - Tries to copy `frosted-ui/styles.css` (or the legacy `@whop/react/styles.css`) from `node_modules`.
   - If neither exists, downloads the canonical CSS from npm.
   - Writes the result to `styles/frosted-ui.css`.
2. Registered the helper via `"postinstall": "node scripts/ensure-frosted-styles.mjs"` in `package.json`.
3. Updated `app/globals.css` to import the local `../styles/frosted-ui.css`, ensuring the build never depends on scripts running in `node_modules`.
4. Ignored the generated file with `styles/.gitignore`.

## Validation
- `pnpm run build` now emits both CSS bundles locally (`966a2eca8ed756ef.css` + `de70bee13400563f.css`).
- Vercel redeploy (after pushing commit `4f8fe75`) restored the designed UI in production.

## Files Changed
- `app/globals.css`
- `package.json`
- `scripts/ensure-frosted-styles.mjs` (new)
- `styles/.gitignore` (new)

