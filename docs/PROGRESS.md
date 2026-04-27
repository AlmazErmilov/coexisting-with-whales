# Progress log

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
