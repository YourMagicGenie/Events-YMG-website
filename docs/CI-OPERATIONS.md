# Events CI and local checks

The `Events checks` workflow verifies pull requests and can be dispatched manually. It runs `npm test` and a browser suite, stores responsive screenshots for three days, uses the npm and Playwright caches, has a five-minute job limit, and cancels superseded runs for the same pull request. It has no production deployment job.

## Browser coverage selection

- Routine code or test changes run the focused browser smoke at **320px, 768px and 1440px**, in addition to the scripted keyboard, reduced-motion, enquiry, privacy and 404 checks at their relevant fixed sizes.
- Pull requests changing `dist/**`, `src/worker.js`, `src/security-headers.js` or `test/browser-smoke.mjs` run the full **13-width** responsive matrix. The HTML pages contain the site's CSS, so any page/layout change is included.
- A manual run can choose `full` under the `visual_matrix` input before a production release. The default is `quick`.
- The workflow is not also triggered on pushes to `main`; a successful required PR check covers the merge and avoids rerunning the same suite after squash merge. The repository owner must configure the `test` job as a required check for this to block unready merges.

## Commands

```sh
npm test                 # unit and static-site checks
npm run test:e2e         # focused 320 / 768 / 1440 browser checks
npm run test:e2e:full    # all 13 responsive widths
```

Install Chromium once with `npx playwright install chromium`. Each browser run recreates `test-results/responsive/`, so a quick run cannot leave older full-matrix screenshots in its artifact folder.

## Measured baseline

Before matrix selection was added, GitHub Actions run [#78](https://github.com/YourMagicGenie/Events-YMG-website/actions/runs/42784949106) exercised all 13 widths and completed in **63 seconds**. The Actions timing endpoint reported **0 billable milliseconds** for that run on this public repository. The focused default reduces browser work and feedback time; the current public-repository run did not consume billable Linux minutes. The separate `performance` job is limited to its existing performance-audit PR and was skipped on #78.

GitHub currently cannot be used through the connected integration to confirm the legacy branch-protection setting. Until the owner verifies Settings → Rules or Branches, whether the `test` status is required on `main` remains unconfirmed. See [issue #33](https://github.com/YourMagicGenie/Events-YMG-website/issues/33).
