# Security policy

## Reporting

If you find a security issue, please **do not open a public issue**. Email Almaz at almaz.ermilov@gmail.com or open a private security advisory on GitHub via the "Security" tab.

## Scope

This is a static site. There is no backend, no database, no user accounts and no secrets in the repository. Realistic concerns include:

- A vulnerability in one of the third-party CDN dependencies (Leaflet, Leaflet.heat, CARTO basemap tiles, EMODnet WMS).
- An XSS introduced by user-supplied content (currently none - all content is from static JSON datasets, but the species filter and modal popups render observation strings).
- A typo in a citation that misrepresents a peer reviewed paper.

## What we do

- The frontend has no authentication. The browser cache is the only thing that persists.
- All third-party libraries are loaded by exact version from a CDN. Dependency updates flow through Dependabot.
- The deployment workflow (`.github/workflows/deploy.yml`) uses GitHub-managed actions only and writes only to the GitHub Pages target.
- Branch `main` is protected: deploys only happen from `main`, tests must pass.

## What we do not promise

The vessel strike risk score is a screening tool, not a regulatory environmental impact assessment. Do not use it as the sole basis for any planning decision affecting protected species.
