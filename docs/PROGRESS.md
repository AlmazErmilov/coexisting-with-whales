# Progress log

## 2026-10-09: reuse the existing whale silhouette

Replaced the custom whale drawing with the existing generic whale silhouette from `assets/whales/illustration-placeholder.svg`. Kept its outline and flipper, then adjusted color and scale for the site mark. Updated the favicon, touch icon, offline snapshot and README source credit.


## 2026-10-07: whale emblem

Replaced the original whale mark with a vector emblem based on curved flukes, a long pectoral fin and engraved throat pleats. A restrained marine chart frame connects it to the site diagrams. The header and fullscreen introduction share the detailed asset. The favicon uses a simplified silhouette, with matching PNG and Apple touch exports. The local snapshot includes the new emblem.

Checked the mark in both themes and small icon sizes. Existing interaction and offline regression checks remain applicable.

## 2026-10-07: marine diagrams and offline atlas

Added a fullscreen replayable marine introduction, animated visual help and responsive vessel speed diagrams. Species cards provide local licensed photos, sourced facts and sample summaries. City labels stay above the heatmap. Controls use nearly square corners and compact mobile layouts.

Removed CDN script dependencies, adopted public OpenStreetMap tiles and added an atomic local snapshot without a database. Historical observation age is separate from browser save date. Corrected port calculations to follow filters and show unknown when no observations are available. External map and shipping failures have visible status messages.

Moved detailed methodology to an indexable about page, updated metadata and sitemap and restricted deployment to public assets. Validation covers models, input escaping, offline reload, responsive diagrams, keyboard navigation, filters and photo cards.

## 2026-04-28 - ship density restyling and heatmap clean up

Pulled the EMODnet vessel density layer away from its default green-yellow-red rainbow into a single-hue overlay so it stops competing with the teal-orange whale heatmap, tightened the heatmap to remove open-ocean ghost spots and added a matching legend block.

- Moved the EMODnet WMS into a dedicated Leaflet pane at z-index 250 with a custom `.ship-density-pane` class. A grayscale + sepia + hue-rotate filter chain plus theme-aware blend modes (`screen` on dark, `multiply` on light) recolour the tiles in-browser; magenta-violet on dark, deep navy on light.
- Tuned `L.heatLayer` from `radius:22, blur:18, minOpacity:0.30` to `radius:17, blur:12, minOpacity:0.05`. Isolated open-ocean observations now fall below the visibility threshold and Lofoten, Vestfjorden, Skagerrak read as crisp clusters instead of soft clouds.
- Added a hidden ship density legend block under the cetacean gradient. The ship-toggle handler shows it when the overlay is on, hides it otherwise, and toggles a `body.ship-active` class that fades the ambient background grid so the shipping lanes read clearly.
- Synced the on-screen cetacean legend gradient with the actual heatmap stops (added the warm amber tail).
- Defined `--ship-low/mid/high` CSS custom properties per theme so the new gradient and any future ship-related UI stay theme-coherent.

Tests: 64 unit + 11 e2e all green.

## 2026-04-27 - light theme and brand polish

Added a light chart theme alongside the dark ocean theme. The theme switch updates the UI, browser theme color and CARTO basemap, and persists the user's choice locally.

- Added a theme button with keyboard shortcut `T`.
- Updated README branding with the project icon and theme note.
- Confirmed the local image CLI accepts `--model gpt-image-2`, but kept this pass on SVG assets because `OPENAI_API_KEY` was not available for a live image generation call in this environment.

## 2026-04-27 - visual polish pass

Refined the public interface with a colder ocean instrument panel style, updated the brand mark, favicon, touch icon and open graph image.

- Tightened the control panel, stats, segmented view toggle, modal, legend and Leaflet popup styling.
- Reworked port markers from generic stars to harbor shaped risk markers while keeping the existing risk color scale.
- Updated the heatmap palette to blend teal observation density with warm high density highlights.
- Verified the static app in desktop and mobile browser viewports.

## 2026-04-27 - initial release

Built end to end as a sister project to Coexisting with Birds. Adapts the same architecture (static HTML/JS, Leaflet, no build step) to whales and shipping in Norwegian waters.

### Architecture decisions

- **Static deployment on GitHub Pages**: free, no backend, single repository, automated via GitHub Actions on push to main.
- **Vessel data via EMODnet WMS**: chosen over AISStream and BarentsWatch because EMODnet allows direct browser use (CORS open, no auth). AISStream blocks browser CORS by design; BarentsWatch needs server side OAuth and would expose secrets if used client side.
- **Cetacean data via GBIF bbox query, not country=NO**: country filter alone misses 80 percent of relevant records since cetaceans live offshore. Bounding box lat 56-82, lon -10 to 70 captures Norwegian Sea, Barents Sea, North Sea and parts of the Russian Arctic.
- **Filtered scoring**: scorePort and scoreRegion only count threatened or strike-vulnerable species. Counting all observations (as in the birds project) over represented dolphins and porpoises and gave inflated risk for ports like Oslo. The displayed nearbyCount still reflects all observations as context.
- **Literature references with DOI tooltips**: every formula in the info modal has a hover popup with the citation and a DOI link. The Vanderlaan and Taggart 2007 logistic curve (P_lethal vs vessel speed) is the central physics, augmented with Rockwood 2017 (encounter theory) and Williams and O'Hara 2010 (co-occurrence index).
- **Filtered out MACHINE_OBSERVATION records**: hydrophone clusters create artificial hotspots at fixed coordinates. Excluded at fetch time.
- **Per port speed slider**: lets the user see the steep slope of the lethality curve live (10 kn → 27%, 14 kn → 70%, 18 kn → 92%). The score scales by P_lethal(v) / P_lethal(14 kn).

### Tests

- 64 unit tests via vitest covering scoring functions, geometry helpers, filter predicates and reference tags.
- 10 end to end tests via Playwright covering page load, stats, species filter, month slider, view toggle, info modal opens, literature references rendered, hide UI button, keyboard shortcuts, escape closes modals.

### Open items

- Phase 2 idea: GitHub Action that pulls a BarentsWatch live AIS snapshot hourly and commits a GeoJSON file. Truly fresh, no secret leakage, optional.
- A few Norwegian Red List entries (sei whale, minke, humpback, white-beaked dolphin, white-sided dolphin, pilot whale) default to LC pending direct verification against the Artsdatabanken site. The fall back is consistent with the Artsdatabanken summary that 27 of 71 mammal species are red-listed and most cetacean threatened entries are concentrated on Arctic and great whales.
- The North Atlantic right whale is listed for completeness but is functionally absent from the NE Atlantic per OSPAR. Records of it are isolated.
