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

**Do not deploy the new GitHub repository by assumption.** No GitHub Actions
deployment controller, source-to-bundle generator, or automatic custom-domain
release is configured yet. Before integrating issue #10 or modifying the site:

1. Establish and test a reproducible build of the site and a Worker static-asset
   deployment path on an isolated preview host, preserving public GET/HEAD,
   redirects, 404/405 responses and cache/security headers.
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
