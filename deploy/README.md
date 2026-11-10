# Deployment and recovery boundary

**Live custom domain:** https://events.ymgconsultingservices.com/

**Production Cloudflare Worker:** `ymg-events-website`

The site was launched 2026-11-09 from Sites-managed project
`appgprj_6af1846f038c8191a5028170979bd4b3` at source commit
`76dd4f9580e546dac33e6605534414ad77408f10`.

`dist/` here is the editable static source from that launch. The launch
baseline used a visitor-reviewed `mailto:` form; the current GitHub source has
an inline form, but it cannot send until the staged Worker path is configured
and released. The original live bundle is a generated standalone
`deploy/cloudflare-worker.mjs` in the Sites-managed source: it embeds HTML,
privacy and JPEG assets for direct Worker upload. The giant generated bundle
is deliberately **not** copied as a second editable source of truth.

## Reproduce and preview the source

The site is buildless. To preview the public static page without credentials or
network calls:

```bash
python3 -m http.server 4173 --directory dist
```

Open `http://localhost:4173/`. For a local run of the Worker and static-assets
binding, install Wrangler locally and run:

```bash
npx wrangler dev --local --config wrangler.json
```

The checked-in Wrangler config is deliberately named `ymg-events-preview` and
contains no routes or custom domains. It binds this repository's `dist/` assets
to `src/worker.js`; it cannot silently attach this source to the production
hostname. Without runtime variables, `/api/events/config` correctly reports
that direct submission is unavailable. The form's email fallback remains
available, while mocked success and failure paths are covered by `npm test`.

The same config can be used for an isolated `workers.dev` preview once a
scoped Cloudflare credential is available. Do not change the config name or
attach a custom domain as part of a preview. Verify anonymous access, `/`,
`/privacy.html`, `/robots.txt`, `/sitemap.xml`, all local images/scripts,
GET/HEAD behavior, form error states and 404/405 responses on that preview.
Record the preview URL and evidence in the release notes. This repository does
not define an automatic production deployment.

**Do not deploy the new GitHub repository by assumption.** No GitHub Actions
deployment controller or automatic custom-domain release is configured. Before
integrating this source with production:

1. Deploy and test the isolated `ymg-events-preview` Worker described above,
   preserving public GET/HEAD, redirects, 404/405 responses and cache/security
   headers.
2. Capture the current production Worker version, bindings and known-good
   recovery target without exposing account IDs, tokens or secret values in Git.
3. Check preview rendering, responsive layout, anonymous access, forms,
   privacy/canonical/robots/sitemap/assets and any linked main-site host checks.
4. Require an explicit, reviewed production promotion with a rollback plan and
   verify the final custom domain. A saved Sites preview is not a live release.

The main site's [issue #63](https://github.com/YourMagicGenie/ymg-scientific-website/issues/63)
tracks old placeholder declarations and must not be allowed to reclaim Events.
Do not change mail DNS or other YMG Workers under this project.

See [Events source migration issue #3](https://github.com/YourMagicGenie/Events-YMG-website/issues/3).
