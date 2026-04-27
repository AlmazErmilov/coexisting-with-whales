"""
Fetch cetacean (whale, dolphin, porpoise) observation data from GBIF.

Source:  GBIF (Global Biodiversity Information Facility)
API:     https://api.gbif.org/v1/occurrence/search
Scope:   Norwegian and surrounding waters (Norwegian Sea, Barents Sea,
         North Sea, Greenland Sea, parts of Russian Arctic)
         Bounding box: lat 56-82, lon -10 to 70
Filter:  order Cetacea (taxonKey=733), georeferenced records only,
         excludes MACHINE_OBSERVATION (acoustic hydrophone clusters skew the map)
Auth:    none required for the search endpoint
License: CC BY 4.0, CC0 and CC BY-NC 4.0 (varies per contributing dataset)

Output:  data/whales_norway.json
  - observations: list of {lat, lon, species, month, year, country, basis}
  - species_summary: top species with total observation counts
  - metadata: source info, sample size, bbox, license

Notes
- country=NO alone misses ~80% of cetacean records (cetaceans live offshore,
  not within terrestrial polygons). Always use the bbox.
- The search API hard-caps offset at 100,000. For >100K records use the
  Occurrence Download API (requires a free GBIF account).
- MACHINE_OBSERVATION records cluster at fixed hydrophone coordinates and
  produce visual hotspots that don't reflect biology. We exclude them.

Usage:
  python3 fetch_data.py
"""
import json
import urllib.request
import urllib.parse
import time

BASE_URL = "https://api.gbif.org/v1/occurrence/search"
CETACEA_TAXON_KEY = 733

# Norwegian and surrounding waters
BBOX = {
    "lat_min": 56,
    "lat_max": 82,
    "lon_min": -10,
    "lon_max": 70,
}

# Per-record fields kept to keep the JSON small (mirror the birds project layout)
def trim(record):
    return {
        "lat": round(record["decimalLatitude"], 4),
        "lon": round(record["decimalLongitude"], 4),
        "species": record["species"],
        "month": record.get("month"),
        "year": record.get("year"),
        "country": record.get("countryCode", ""),
        "basis": record.get("basisOfRecord", ""),
        "dataset": record.get("datasetName", ""),
    }


def fetch_observations(limit_total=10000, page_size=300):
    """Fetch cetacean observations stratified by month to balance summer skew."""
    all_records = []
    per_month = limit_total // 12

    for month in range(1, 13):
        offset = 0
        month_records = []
        print(f"Fetching month {month}...")

        while len(month_records) < per_month:
            params = {
                "taxonKey": CETACEA_TAXON_KEY,
                "hasCoordinate": "true",
                "hasGeospatialIssue": "false",
                "decimalLatitude": f"{BBOX['lat_min']},{BBOX['lat_max']}",
                "decimalLongitude": f"{BBOX['lon_min']},{BBOX['lon_max']}",
                "month": month,
                "limit": page_size,
                "offset": offset,
            }
            url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"

            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as resp:
                data = json.loads(resp.read().decode())

            results = data.get("results", [])
            if not results:
                break

            for r in results:
                lat = r.get("decimalLatitude")
                lon = r.get("decimalLongitude")
                species = r.get("species")
                basis = r.get("basisOfRecord", "")
                if lat is None or lon is None or not species:
                    continue
                # Skip acoustic detections that cluster at fixed hydrophone coordinates.
                if basis == "MACHINE_OBSERVATION":
                    continue
                month_records.append(trim(r))

            offset += page_size
            if data.get("endOfRecords") or offset >= 100000:
                break
            time.sleep(0.15)

        all_records.extend(month_records[:per_month])
        print(f"  Month {month}: {len(month_records[:per_month])} records")

    return all_records


def fetch_species_summary():
    """Get species with counts via the facet API."""
    params = {
        "taxonKey": CETACEA_TAXON_KEY,
        "hasCoordinate": "true",
        "hasGeospatialIssue": "false",
        "decimalLatitude": f"{BBOX['lat_min']},{BBOX['lat_max']}",
        "decimalLongitude": f"{BBOX['lon_min']},{BBOX['lon_max']}",
        "limit": 0,
        "facet": "speciesKey",
        "facetLimit": 30,
    }
    url = f"{BASE_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())

    species_counts = []
    for facet in data.get("facets", []):
        for c in facet.get("counts", []):
            key = c["name"]
            count = c["count"]
            sp_url = f"https://api.gbif.org/v1/species/{key}"
            try:
                with urllib.request.urlopen(sp_url) as sp_resp:
                    sp_data = json.loads(sp_resp.read().decode())
                species_counts.append({
                    "species": sp_data.get("canonicalName", sp_data.get("scientificName", "Unknown")),
                    "speciesKey": key,
                    "count": count,
                })
            except Exception as e:
                print(f"  species lookup failed for {key}: {e}")
            time.sleep(0.1)

    return species_counts


def main():
    print("=== Fetching cetacean observations for Norwegian and surrounding waters ===")
    records = fetch_observations(limit_total=10000, page_size=300)
    print(f"Total records fetched: {len(records)}")

    species_set = set(r["species"] for r in records)
    print(f"Unique species: {len(species_set)}")

    print("\n=== Fetching top species summary ===")
    species_summary = fetch_species_summary()
    for s in species_summary[:15]:
        print(f"  {s['species']}: {s['count']:,}")

    output = {
        "observations": records,
        "species_summary": species_summary,
        "metadata": {
            "source": "GBIF (Global Biodiversity Information Facility)",
            "scope": "Norwegian Sea, Barents Sea, North Sea, Greenland Sea, Russian Arctic shelf",
            "order": "Cetacea (whales, dolphins, porpoises)",
            "taxonKey": CETACEA_TAXON_KEY,
            "bbox": BBOX,
            "filter": "excludes MACHINE_OBSERVATION (hydrophone clusters)",
            "sample_size": len(records),
            "license": "CC BY 4.0 / CC0 / CC BY-NC 4.0 (per contributing dataset)",
            "citation": "GBIF.org GBIF Occurrence Download for order Cetacea, Norwegian and surrounding waters",
        }
    }

    out_path = "data/whales_norway.json"
    with open(out_path, "w") as f:
        json.dump(output, f)
    print(f"\nSaved to {out_path} ({len(json.dumps(output)) / 1024:.0f} KB)")


if __name__ == "__main__":
    main()
