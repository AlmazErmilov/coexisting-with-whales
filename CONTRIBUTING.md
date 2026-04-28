# Contributing

Thanks for the interest. Coexisting with Whales is a small static site, but it tries to stay scientifically credible: every formula has a published source and every dataset has a license. Please keep that bias.

## Getting set up

```bash
git clone https://github.com/AlmazErmilov/coexisting-with-whales
cd coexisting-with-whales
npm install
python3 -m http.server 8080
# open http://localhost:8080
```

There is no build step. Edit and reload.

## Running the test suite

```bash
npm run test:unit              # vitest, fast
npx playwright install chromium # one-time
npm run test:e2e               # playwright, slower
npm test                       # both
```

## What kinds of changes are welcome

- Data corrections backed by a primary source (Artsdatabanken page, IUCN entry, DOI to a paper).
- New cetacean species accounts for the species table.
- New literature references with DOI links rendered as a popup.
- UI polish, accessibility fixes, mobile layout improvements.
- Performance work on the heatmap or the per port scoring.

## What is out of scope

- Anything that requires a backend, hosted database, or paid API. The site has to stay deployable from GitHub Pages with no secrets.
- Datasets that ban redistribution (for example WDPA). Prefer NLOD, CC BY, CC0 sources.

## Style notes

- JavaScript modules use plain ES modules with no bundler. Keep imports relative.
- Pure functions live in `js/scoring.js` (no DOM access). DOM updates live in `js/ui.js`. The orchestrator is `js/app.js`.
- Conservation status, species lists and seasonality live in `js/data.js`. Each entry there should be backed by a verifiable source, ideally cited in `js/refs.js`.
- Commits use conventional prefixes (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).

## Reviewing collision risk formulas

Before changing a published formula coefficient, please open an issue first and link the source paper. The Vanderlaan and Taggart 2007 logistic curve is the canonical lethality function used here; its β₀ = -4.89 and β₁ = 0.41 are the simple-logistic estimates from the original paper, not the bootstrap fit. Any change has to keep the published reference values verifiable in the unit tests (P=0.21 at 8.6 kn, ≈0.5 at 11.8 kn, 0.79 at 15 kn).
