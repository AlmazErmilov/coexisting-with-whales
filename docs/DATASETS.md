# Dataset notes

This document records concrete URLs, scope, license and gotchas for every dataset used by the app. The high level summary is in the main [README](../README.md).

## Cetacean observations - GBIF

- **Endpoint**: `https://api.gbif.org/v1/occurrence/search`
- **Taxonomic key**: `taxonKey=733` (order Cetacea, includes both Mysticeti and Odontoceti).
- **Bounding box**: `decimalLatitude=56,82&decimalLongitude=-10,70`. Country filter alone misses ~80% of relevant records (28,870 vs 137,820 in the bbox).
- **Filters applied**: `hasCoordinate=true&hasGeospatialIssue=false`. Records with `basisOfRecord=MACHINE_OBSERVATION` are dropped at fetch time because acoustic hydrophone clusters produce repeated coordinates that distort the heatmap.
- **Sample**: 10,000 records, stratified evenly across 12 months to balance the strong summer skew. Each record kept: lat, lon, species, month, year, country, basisOfRecord, datasetName.
- **License**: per contributing dataset. Mix of CC0, CC BY 4.0 and CC BY-NC 4.0 (~36% non-commercial).
- **Citation**: GBIF.org GBIF Occurrence Search for order Cetacea, Norwegian and surrounding waters.
- **Hard pagination ceiling**: GBIF search API caps `offset` at 100,000. For larger samples the asynchronous Occurrence Download API is required (free GBIF account, returns a DOI).

Top species in the bbox:

| Rank | Species                       | Common name                  | Records |
|------|-------------------------------|------------------------------|---------|
| 1    | Phocoena phocoena             | harbour porpoise             | 67,064  |
| 2    | Balaenoptera physalus         | fin whale                    | 16,660  |
| 3    | Tursiops truncatus            | bottlenose dolphin           | 13,033  |
| 4    | Balaenoptera acutorostrata    | minke whale                  | 5,907   |
| 5    | Lagenorhynchus albirostris    | white-beaked dolphin         | 4,382   |
| 6    | Balaenoptera borealis         | sei whale                    | 4,301   |
| 7    | Megaptera novaeangliae        | humpback whale               | 3,884   |
| 8    | Orcinus orca                  | killer whale                 | 3,557   |
| 9    | Physeter macrocephalus        | sperm whale                  | 3,226   |
| 10   | Delphinus delphis             | common dolphin               | 3,066   |

## Sea regions - Marine Regions IHO v3

- **Endpoint**: VLIZ WFS at `https://geo.vliz.be/geoserver/MarineRegions/wfs`
- **Layer**: `MarineRegions:iho`, filter by `name='Norwegian Sea'`, `'Barents Sea'`, `'North Sea'`, `'Greenland Sea'`
- **Output**: `application/json` (GeoJSON)
- **License**: CC BY 4.0, DOI 10.14284/323
- **Simplification**: mapshaper `-simplify 1% keep-shapes`. Final size 43 KB total for all four seas.
- **Note**: VLIZ WFS is rate limited; bake the GeoJSON into the repo rather than fetching live.

## Norwegian EEZ - Marine Regions

- **Endpoint**: same VLIZ WFS, layer `MarineRegions:eez`
- **MRGIDs**: 5686 (mainland), 8437 (Jan Mayen), 33181 (Svalbard)
- **License**: CC BY 4.0, DOI 10.14284/632, Maritime Boundaries Geodatabase v12 (Flanders Marine Institute, 2023)
- **Simplification**: mapshaper `-simplify 2% keep-shapes`. Final size 88 KB.

## Coastline - Natural Earth

- **Endpoint**: `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson`
- **License**: public domain
- **Simplification**: mapshaper `-clip bbox=4,55,35,82 -simplify 5% keep-shapes`. Final size 10 KB.

## Major Norwegian ports - hand curated

- **Source**: Wikipedia "List of ports in Norway" cross referenced with [Kystverket](https://www.kystverket.no/)
- **Coverage**: 25 ports
- **Fields**: name, latitude, longitude, type (general, container, oil, gas, lng, fishing, iron-ore), approximate annual throughput in million tonnes
- **License**: this list is hand curated; coordinates rounded to 2 decimals (~1 km accuracy)
- **Why hand curated**: Kystverket's Havnedata via Geonorge is too detailed for a 25 port overlay; OSM Overpass results introduce ODbL friction. A small static JSON keeps things simple and free of license complications.

## Vessel density - EMODnet Human Activities

- **Endpoint (WMS)**: `https://ows.emodnet-humanactivities.eu/wms`
- **Layer**: `vesseldensity_allavg` (annual average, all vessel types). Other layers split by ship type: `vesseldensity_01avg` (fishing), `09avg` (cargo), `10avg` (tanker), `08avg` (passenger), etc.
- **CORS**: open (`access-control-allow-origin: *`), confirmed live April 2026.
- **Auth**: none. `<Fees>NONE</Fees>` per WMS GetCapabilities.
- **Coverage**: 1x1 km grid, EU waters and neighbouring areas (includes Norwegian Sea, North Sea, Barents Sea border). Density expressed as hours/km^2/month.
- **Time range**: 2017 to 2024. Note: 2024 is sparser due to satellite data loss starting June 2024; the annual average layer is more stable.
- **License**: EMODnet open. Attribution required to EMODnet Human Activities and to CLS, ORBCOMM and vesseltracker.com as AIS data providers.

## Norwegian Red List 2021 - Artsdatabanken

- **Source**: [Artsdatabanken](https://artsdatabanken.no/lister/rodlisteforarter/2021)
- **Scope**: cetaceans assessed for Norwegian and Norwegian sea areas.
- **Verified entries** (with primary URLs):
  - Beluga (Delphinapterus leucas): EN, ~549 individuals in Svalbard. https://lister.artsdatabanken.no/rodlisteforarter/2021/27646
  - Bowhead (Balaena mysticetus): EN. Spitsbergen stock severely depleted.
  - Narwhal (Monodon monoceros): VU. Small Svalbard population.
  - Blue whale (Balaenoptera musculus): EN.
  - Fin whale (Balaenoptera physalus): LC nationally (despite VU globally). Recovering Norwegian feeding population.
  - Harbour porpoise (Phocoena phocoena): LC nationally; ~256K individuals.
  - Killer whale (Orcinus orca): LC nationally; ~15K individuals.
  - Sperm whale (Physeter macrocephalus): NA (only non-reproductive males in NO; the Red List does not assess populations whose reproduction does not occur in the assessment area).
- **Pending verification**: sei whale, minke whale, humpback whale, white-beaked dolphin, white-sided dolphin, long-finned pilot whale, Sowerby's beaked whale - default to LC consistent with the Artsdatabanken summary that 27 of 71 mammal species are red-listed.

## Global IUCN Red List

- **Source**: [IUCN](https://www.iucnredlist.org/)
- **Used as fallback** when the Norwegian assessment is NA (vagrants, species whose reproduction does not occur in Norwegian waters).

## Collision risk literature

See `js/refs.js` for the structured bibliography rendered as DOI tooltips. The headline references are listed in the main README.

## Storage budget

| File                       | Size    | License                       |
|----------------------------|---------|-------------------------------|
| data/whales_norway.json    | 1.7 MB  | CC BY 4.0 / CC0 / CC BY-NC 4.0 |
| data/eez.geojson           | 88 KB   | CC BY 4.0                     |
| data/sea_regions.geojson   | 43 KB   | CC BY 4.0                     |
| data/coastline.geojson     | 10 KB   | public domain                 |
| data/ports.json            | 4 KB    | hand curated                  |
| **Total bundled data**     | **~1.8 MB** |                           |

Well within GitHub Pages constraints. The EMODnet vessel density grid is fetched on demand via WMS and not stored.
