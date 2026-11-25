# Events CI and local checks

The `Events checks` workflow verifies pull requests and can be dispatched manually. It runs `npm test` and a browser suite, stores responsive screenshots for three days, uses the npm and Playwright caches, has a five-minute job limit, and cancels superseded runs for the same pull request. It has no production deployment job. It is the only workflow that runs on pull requests, and its single job `test` is the required PR check on `main`.

## Change classification (#130)

The workflow runs on every pull request, with no path filter. Its first step diffs the PR against its base:

- **Docs-only** (every changed path is under `docs/` other than `docs/collateral/`, under `reference/`, or a `*.md` file): the job prints a note and passes in seconds without installing dependencies.
- **Anything else**, including a mix of docs and code: the full unit, site and browser suite runs, and a failure blocks the merge.
- If the base cannot be fetched or diffed, the step fails with an `::error::` annotation and the check is red. An empty diff runs the full suite.

Before #130 a separate `docs-only-checks.yml` emitted a second job named `test` through `paths-ignore`. Because `paths-ignore` still fires when *any* changed file is outside its list, a mixed PR got a passing echo-only `test` next to the real one (seen on PR #128 and PR #143). That workflow was removed in the same change, so only one `test` result remains and the required check's name did not change.

## Browser coverage selection

- Routine code or test changes run the focused browser smoke at **320px, 768px and 1440px**, in addition to the scripted keyboard, reduced-motion, inquiry, privacy and 404 checks at their relevant fixed sizes.
- Pull requests changing `dist/**`, `src/worker.js`, `src/security-headers.js` or `test/browser-smoke.mjs` run the full **13-width** responsive matrix. The HTML pages contain the site's CSS, so any page/layout change is included.
- A manual run can choose `full` under the `visual_matrix` input before a production release. The default is `quick`.
- The workflow is not also triggered on pushes to `main`; a successful required PR check covers the merge and avoids rerunning the same suite after squash merge.

## Commands

```sh
npm test                 # unit and static-site checks
npm run test:e2e         # focused 320 / 768 / 1440 browser checks
npm run test:e2e:full    # all 13 responsive widths
```

Install Chromium once with `npx playwright install chromium`. Each browser run recreates `test-results/responsive/`, so a quick run cannot leave older full-matrix screenshots in its artifact folder.

## Measured baseline

Before matrix selection was added, GitHub Actions run [#78](https://github.com/YourMagicGenie/Events-YMG-website/actions/runs/42784949106) exercised all 13 widths and completed in **63 seconds**. The Actions timing endpoint reported **0 billable milliseconds** for that run on this public repository. The focused default reduces browser work and feedback time; the current public-repository run did not consume billable Linux minutes. The separate `performance` job is limited to its existing performance-audit PR and was skipped on #78.

## Branch protection

Checked on 25 November 2026 with `gh api repos/YourMagicGenie/Events-YMG-website/branches/main/protection`: classic branch protection on `main` requires the status check `test` from GitHub Actions (app 15368), with `strict: false`. #130 kept that context name, so the protection setting needed no edit and there was no ungated period.

