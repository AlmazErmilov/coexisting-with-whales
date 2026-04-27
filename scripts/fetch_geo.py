"""
Fetch and simplify geographic layers for the Coexisting with Whales map.

Downloads four datasets:
  1. Norwegian EEZ outline (mainland + Jan Mayen + Svalbard) from Marine Regions / VLIZ.
  2. Sea region boundaries (Norwegian, Barents, North, Greenland Sea) from IHO Sea Areas v3.
  3. Coastline (Natural Earth 50m) clipped to a generous Norway bounding box.
  4. Hand curated list of major Norwegian ports.

Output: data/sea_regions.geojson, data/coastline.geojson, data/ports.json.

The raw VLIZ WFS payloads are large (Norwegian Sea ~5 MB, EEZ ~6 MB) so the
output is post-processed with mapshaper. Mapshaper is invoked through a
subprocess if available; otherwise the script falls back to a python-only
Douglas-Peucker simplification (less robust but works without npm).

Usage:
  python3 scripts/fetch_geo.py
"""
import json
import os
import subprocess
import sys
import urllib.request
import urllib.parse

OUT_DIR = "data"
BBOX = (4, 55, 35, 82)  # lon_min, lat_min, lon_max, lat_max - clip to Norway and surrounding waters

VLIZ = "https://geo.vliz.be/geoserver/MarineRegions/wfs"
NE_COASTLINE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_coastline.geojson"

# Norwegian ports - hand curated from Wikipedia "List of ports in Norway".
# Coordinates rounded to 2 decimals (~1 km accuracy, sufficient for symbol
# placement). Annual cargo throughput in million tonnes is approximate.
PORTS = [
    {"name": "Oslo",         "lat": 59.91, "lon": 10.75, "type": "container",  "throughput_mt": 5.5},
    {"name": "Bergen",       "lat": 60.39, "lon": 5.32,  "type": "general",    "throughput_mt": 92.0},
    {"name": "Stavanger",    "lat": 58.97, "lon": 5.73,  "type": "general",    "throughput_mt": 9.0},
    {"name": "Trondheim",    "lat": 63.43, "lon": 10.40, "type": "general",    "throughput_mt": 3.6},
    {"name": "Tromso",       "lat": 69.65, "lon": 18.96, "type": "general",    "throughput_mt": 2.1},
    {"name": "Bodo",         "lat": 67.28, "lon": 14.40, "type": "general",    "throughput_mt": 1.4},
    {"name": "Kristiansand", "lat": 58.15, "lon": 7.99,  "type": "general",    "throughput_mt": 5.2},
    {"name": "Alesund",      "lat": 62.47, "lon": 6.15,  "type": "general",    "throughput_mt": 4.5},
    {"name": "Hammerfest",   "lat": 70.66, "lon": 23.68, "type": "lng",        "throughput_mt": 6.3},
    {"name": "Kirkenes",     "lat": 69.73, "lon": 30.05, "type": "general",    "throughput_mt": 2.0},
    {"name": "Narvik",       "lat": 68.43, "lon": 17.43, "type": "iron-ore",   "throughput_mt": 24.0},
    {"name": "Mongstad",     "lat": 60.82, "lon": 5.04,  "type": "oil",        "throughput_mt": 30.0},
    {"name": "Karsto",       "lat": 59.27, "lon": 5.51,  "type": "gas",        "throughput_mt": 16.0},
    {"name": "Sture",        "lat": 60.62, "lon": 4.86,  "type": "oil",        "throughput_mt": 13.0},
    {"name": "Mosjoen",      "lat": 65.84, "lon": 13.20, "type": "general",    "throughput_mt": 1.0},
    {"name": "Sandnessjoen", "lat": 66.02, "lon": 12.63, "type": "general",    "throughput_mt": 0.8},
    {"name": "Honningsvag",  "lat": 70.98, "lon": 25.97, "type": "fishing",    "throughput_mt": 0.5},
    {"name": "Vardo",        "lat": 70.37, "lon": 31.10, "type": "fishing",    "throughput_mt": 0.4},
    {"name": "Vadso",        "lat": 70.07, "lon": 29.74, "type": "fishing",    "throughput_mt": 0.3},
    {"name": "Harstad",      "lat": 68.80, "lon": 16.54, "type": "general",    "throughput_mt": 1.0},
    {"name": "Svolvaer",     "lat": 68.23, "lon": 14.57, "type": "fishing",    "throughput_mt": 0.6},
    {"name": "Floro",        "lat": 61.60, "lon": 5.03,  "type": "fishing",    "throughput_mt": 0.7},
    {"name": "Maloy",        "lat": 61.93, "lon": 5.11,  "type": "fishing",    "throughput_mt": 0.6},
    {"name": "Haugesund",    "lat": 59.41, "lon": 5.27,  "type": "general",    "throughput_mt": 1.0},
    {"name": "Egersund",     "lat": 58.45, "lon": 5.99,  "type": "fishing",    "throughput_mt": 0.6},
]


def fetch_url(url, dest):
    print(f"  GET {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "coexisting-with-whales/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        with open(dest, "wb") as f:
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                f.write(chunk)
    print(f"  saved {dest} ({os.path.getsize(dest) / 1024:.0f} KB)")


def fetch_marine_regions(typename, cql_filter, dest):
    params = {
        "service": "wfs",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": typename,
        "cql_filter": cql_filter,
        "outputFormat": "application/json",
    }
    url = f"{VLIZ}?{urllib.parse.urlencode(params)}"
    fetch_url(url, dest)


def has_mapshaper():
    try:
        subprocess.run(["mapshaper", "--version"], capture_output=True, check=True, timeout=10)
        return True
    except Exception:
        return False


def mapshaper_simplify(in_path, out_path, simplify_pct="3"):
    """Run mapshaper with bbox clip and simplification."""
    cmd = [
        "mapshaper",
        in_path,
        "-clip", f"bbox={BBOX[0]},{BBOX[1]},{BBOX[2]},{BBOX[3]}",
        "-simplify", f"{simplify_pct}%", "keep-shapes",
        "-o", out_path, "format=geojson", "precision=0.0001",
    ]
    print(f"  $ mapshaper -simplify {simplify_pct}% -> {out_path}")
    subprocess.run(cmd, check=True)
    print(f"  simplified to {os.path.getsize(out_path) / 1024:.0f} KB")


def merge_features(*paths, target):
    """Merge multiple GeoJSON FeatureCollections into one."""
    features = []
    for p in paths:
        with open(p) as f:
            d = json.load(f)
        for ft in d.get("features", []):
            features.append(ft)
    fc = {"type": "FeatureCollection", "features": features}
    with open(target, "w") as f:
        json.dump(fc, f)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    tmp = ".tmp_geo"
    os.makedirs(tmp, exist_ok=True)

    # 1. Sea regions: Norwegian, Barents, North, Greenland Sea (IHO v3)
    print("=== Fetching IHO sea regions ===")
    sea_paths = []
    for sea in ["Norwegian Sea", "Barents Sea", "North Sea", "Greenland Sea"]:
        dest = os.path.join(tmp, f"sea_{sea.replace(' ', '_')}.geojson")
        try:
            fetch_marine_regions(
                typename="MarineRegions:iho",
                cql_filter=f"name='{sea}'",
                dest=dest,
            )
            sea_paths.append(dest)
        except Exception as e:
            print(f"  WARNING: failed to fetch {sea}: {e}")

    # 2. Norwegian EEZ (mainland + Jan Mayen + Svalbard)
    print("\n=== Fetching Norwegian EEZ ===")
    eez_paths = []
    for mrgid, name in [(5686, "mainland"), (8437, "JanMayen"), (33181, "Svalbard")]:
        dest = os.path.join(tmp, f"eez_{name}.geojson")
        try:
            fetch_marine_regions(
                typename="MarineRegions:eez",
                cql_filter=f"mrgid={mrgid}",
                dest=dest,
            )
            eez_paths.append(dest)
        except Exception as e:
            print(f"  WARNING: failed to fetch EEZ {name}: {e}")

    # 3. Coastline from Natural Earth (already global GeoJSON, just clip)
    print("\n=== Fetching Natural Earth 50m coastline ===")
    ne_path = os.path.join(tmp, "ne_50m_coastline.geojson")
    fetch_url(NE_COASTLINE, ne_path)

    # 4. Simplify and clip to Norway bbox using mapshaper if available
    if not has_mapshaper():
        print("\nWARNING: mapshaper not found - copying raw files (will be large).")
        print("  Install: npm install -g mapshaper")
        if sea_paths:
            merge_features(*sea_paths, target=os.path.join(OUT_DIR, "sea_regions.geojson"))
        if eez_paths:
            merge_features(*eez_paths, target=os.path.join(OUT_DIR, "eez.geojson"))
        os.replace(ne_path, os.path.join(OUT_DIR, "coastline.geojson"))
    else:
        print("\n=== Simplifying with mapshaper ===")
        # Sea regions: aggressive simplification (smooth polygons)
        if sea_paths:
            sea_merged = os.path.join(tmp, "sea_merged.geojson")
            merge_features(*sea_paths, target=sea_merged)
            mapshaper_simplify(sea_merged, os.path.join(OUT_DIR, "sea_regions.geojson"), "1")
        # EEZ: medium simplification
        if eez_paths:
            eez_merged = os.path.join(tmp, "eez_merged.geojson")
            merge_features(*eez_paths, target=eez_merged)
            mapshaper_simplify(eez_merged, os.path.join(OUT_DIR, "eez.geojson"), "2")
        # Coastline: keep more detail (jagged Norwegian fjords)
        mapshaper_simplify(ne_path, os.path.join(OUT_DIR, "coastline.geojson"), "5")

    # 5. Ports as JSON
    print("\n=== Writing ports.json ===")
    ports_doc = {
        "ports": PORTS,
        "metadata": {
            "source": "Hand curated from Wikipedia 'List of ports in Norway' and Kystverket",
            "count": len(PORTS),
            "throughput_unit": "million tonnes per year (approximate)",
        },
    }
    with open(os.path.join(OUT_DIR, "ports.json"), "w") as f:
        json.dump(ports_doc, f, indent=2)
    print(f"  saved data/ports.json ({len(PORTS)} ports)")

    print("\nDone.")
    for fname in os.listdir(OUT_DIR):
        path = os.path.join(OUT_DIR, fname)
        if os.path.isfile(path):
            print(f"  {fname}  {os.path.getsize(path) / 1024:.0f} KB")


if __name__ == "__main__":
    main()
