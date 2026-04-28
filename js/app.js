// Entry point: map init, data loading, marker creation, events.

import {
    RED_LIST_CATEGORIES, COMMON_NAMES, MONTH_NAMES, escapeHtml, bestStatus,
    DEFAULT_SHIP_SPEED_KN, KNOT_TO_KMH,
} from './data.js';
import {
    scorePort, scoreToColor, riskLabel, getStrikeRisk, pointInFeature,
    scoreRegion, pLethalVT2007, knotsToKmh,
} from './scoring.js';
import {
    initUI, updateState, toggleUI, applyFilters, setView,
    togglePorts, toggleShipDensity, toggleConfidence, getFilteredData,
} from './ui.js';

// State.
let allData = [];
let regionLayer = null;
let portLayer = null;
let shipDensityLayer = null;
let coastlineLayer = null;
let eezLayer = null;
let baseLayer = null;

const THEMES = {
    dark: {
        label: 'Switch to light theme',
        next: 'light',
        tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        themeColor: '#061017',
        coastline: 'rgba(255,255,255,0.18)',
        eez: 'rgba(124,231,215,0.30)',
        region: 'rgba(124,231,215,0.18)',
    },
    light: {
        label: 'Switch to dark theme',
        next: 'dark',
        tileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        themeColor: '#eef6f4',
        coastline: 'rgba(10,45,55,0.28)',
        eez: 'rgba(8,127,125,0.38)',
        region: 'rgba(8,127,125,0.28)',
    },
};

function currentTheme() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function themedLayerStyle(kind) {
    const theme = THEMES[currentTheme()];
    if (kind === 'coastline') {
        return { color: theme.coastline, weight: 0.6, fillOpacity: 0 };
    }
    if (kind === 'eez') {
        return { color: theme.eez, weight: 1, dashArray: '6,4', fillOpacity: 0 };
    }
    return {
        color: theme.region,
        weight: 0.8,
        fillColor: 'transparent',
        fillOpacity: 0,
    };
}

function updateThemeButton() {
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    const theme = THEMES[currentTheme()];
    btn.setAttribute('aria-label', theme.label);
    btn.setAttribute('title', `${theme.label} [T]`);
}

function applyTheme(themeName) {
    const themeKey = themeName === 'light' ? 'light' : 'dark';
    const theme = THEMES[themeKey];
    document.documentElement.dataset.theme = themeKey;
    localStorage.setItem('whales-theme', themeKey);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.themeColor);

    if (baseLayer) {
        map.removeLayer(baseLayer);
    }
    baseLayer = L.tileLayer(theme.tileUrl, { maxZoom: 18 }).addTo(map);
    baseLayer.bringToBack();

    if (coastlineLayer) coastlineLayer.setStyle(themedLayerStyle('coastline'));
    if (eezLayer) eezLayer.setStyle(themedLayerStyle('eez'));
    if (regionLayer) regionLayer.setStyle(themedLayerStyle('region'));
    updateThemeButton();
}

function toggleTheme() {
    applyTheme(THEMES[currentTheme()].next);
}

// Init map centered on the Norwegian Sea (between mainland Norway and Svalbard).
const map = L.map('map', {
    center: [69, 12],
    zoom: 4,
    minZoom: 3,
    maxZoom: 12,
    zoomControl: false,
    attributionControl: false,
    worldCopyJump: true,
});

L.control.zoom({ position: 'topright' }).addTo(map);
L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution(
    '© OpenStreetMap · CARTO · GBIF · EMODnet · Marine Regions · Natural Earth'
).addTo(map);

// Dedicated pane for the EMODnet ship density layer so its CSS filter
// (which retones EMODnet's default rainbow palette into a single hue that
// does not clash with the teal/orange whale heatmap) does not bleed into
// the basemap or the whale layers. The custom class lets CSS target the
// pane without depending on Leaflet's internal naming convention.
const shipPane = map.createPane('ships');
shipPane.classList.add('ship-density-pane');
shipPane.style.zIndex = 250;

applyTheme(currentTheme());

// Load data.
Promise.all([
    fetch('data/whales_norway.json').then(r => r.json()),
    fetch('data/sea_regions.geojson').then(r => r.json()).catch(() => null),
    fetch('data/coastline.geojson').then(r => r.json()).catch(() => null),
    fetch('data/eez.geojson').then(r => r.json()).catch(() => null),
    fetch('data/ports.json').then(r => r.json()).catch(() => null),
]).then(([whaleData, seaRegions, coastlineGeoJSON, eezGeoJSON, portsData]) => {
    document.getElementById('loading').style.display = 'none';
    allData = whaleData.observations;

    document.getElementById('stat-obs').textContent = allData.length.toLocaleString();
    const uniqueSpecies = new Set(allData.map(d => d.species));
    document.getElementById('stat-species').textContent = uniqueSpecies.size;

    // Populate species filter.
    const select = document.getElementById('species-filter');
    const speciesCounts = new Map();
    allData.forEach(d => speciesCounts.set(d.species, (speciesCounts.get(d.species) || 0) + 1));
    const sortedSpecies = [...speciesCounts.entries()].sort((a, b) => b[1] - a[1]);
    sortedSpecies.forEach(([species, count]) => {
        const opt = document.createElement('option');
        opt.value = species;
        const cn = COMMON_NAMES[species]?.en;
        const label = cn ? `${species} – ${cn}` : species;
        opt.textContent = count >= 1000
            ? `${label} (${(count / 1000).toFixed(1)}K)`
            : `${label} (${count})`;
        select.appendChild(opt);
    });

    // Coastline (subtle line, no fill).
    if (coastlineGeoJSON) {
        coastlineLayer = L.geoJSON(coastlineGeoJSON, {
            style: themedLayerStyle('coastline'),
            interactive: false,
        }).addTo(map);
    }

    // EEZ (very subtle dashed line).
    if (eezGeoJSON) {
        eezLayer = L.geoJSON(eezGeoJSON, {
            style: themedLayerStyle('eez'),
            interactive: false,
        }).addTo(map);
    }

    // Sea regions.
    if (seaRegions) {
        regionLayer = L.geoJSON(seaRegions, {
            style: themedLayerStyle('region'),
            onEachFeature: (feature, layer) => {
                const name = feature.properties.name || feature.properties.NAME || 'Sea region';
                layer.bindTooltip(escapeHtml(name), {
                    className: 'region-tooltip', sticky: true,
                });
                layer.on('click', () => openRegionModal(layer, name));
            },
        }).addTo(map);

        // Pre-assign each observation to its sea region (one-time point-in-polygon).
        const rLayers = [];
        regionLayer.eachLayer(l => rLayers.push(l));
        allData.forEach(o => {
            for (const rl of rLayers) {
                const b = rl.getBounds();
                if (o.lat >= b.getSouth() && o.lat <= b.getNorth() &&
                    o.lon >= b.getWest() && o.lon <= b.getEast()) {
                    if (pointInFeature(o.lat, o.lon, rl.feature.geometry)) {
                        o._region = rl;
                        break;
                    }
                }
            }
        });
        updateState('regionLayer', regionLayer);
    }

    // EMODnet vessel density WMS (no auth, CORS open).
    // Use the all-types annual average; the 2024 layer is sparse per the
    // satellite data loss noted in EMODnet's metadata, so the annual average
    // gives a stable picture.
    shipDensityLayer = L.tileLayer.wms('https://ows.emodnet-humanactivities.eu/wms', {
        layers: 'vesseldensity_allavg',
        format: 'image/png',
        transparent: true,
        version: '1.3.0',
        opacity: 0.65,
        pane: 'ships',
    });
    // Off by default; user toggles with the checkbox.

    // Ports with strike-risk scoring.
    if (portsData) {
        portLayer = L.layerGroup();
        const ports = portsData.ports;
        document.getElementById('port-count').textContent = ports.length + ' ports';

        ports.forEach(port => {
            const { normScore, riskSpecies, nearbyCount } = scorePort(port, allData);
            port._score = normScore;
            port._nearby = nearbyCount;
            port._riskSpecies = riskSpecies;

            const portColor = scoreToColor(normScore);
            const sz = Math.max(14, Math.min(28, Math.sqrt(port.throughput_mt) * 4));
            const icon = L.divIcon({
                html: `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" style="filter:drop-shadow(0 3px 9px rgba(0,0,0,0.75))">
                    <path d="M12 2.8 L20.5 9.8 L17.6 21.2 H6.4 L3.5 9.8 Z" fill="${portColor}" opacity="0.92" stroke="rgba(255,255,255,0.68)" stroke-width="1"/>
                    <path d="M8 12.2 H16 M12 7.2 V16.8 M9.5 15.2 C10.4 16.3 11.1 16.8 12 16.8 C12.9 16.8 13.6 16.3 14.5 15.2" fill="none" stroke="rgba(6,16,23,0.82)" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>`,
                className: 'port-marker',
                iconSize: [sz, sz],
                iconAnchor: [sz / 2, sz / 2],
            });
            const marker = L.marker([port.lat, port.lon], { icon });

            const risk = riskLabel(normScore);
            const topRisk = Object.entries(riskSpecies)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 4)
                .map(([sp, d]) => {
                    const cat = d.rl ? RED_LIST_CATEGORIES[d.rl] : null;
                    const badge = cat ? `<span style="color:${cat.color};font-weight:700">${d.rl}</span> ` : '';
                    const riskMark = d.risk === 'high' ? ' &#9650;' : d.risk === 'medium' ? ' &#9679;' : '';
                    return `${badge}<i>${escapeHtml(sp)}</i>${riskMark} (${d.count})`;
                }).join('<br>');

            marker.bindPopup(
                `<b>${escapeHtml(port.name)}</b><br>` +
                `Type: ${escapeHtml(port.type)} | Throughput: ${port.throughput_mt} Mt/yr` +
                `<br><span style="color:${risk.color};font-weight:700">${risk.text}</span>` +
                ` <span style="color:#888">(${nearbyCount} obs within 30 km)</span>` +
                (topRisk ? `<br><span style="font-size:11px">${topRisk}</span>` : '') +
                `<br><span style="color:#888;font-size:10px">Click the port symbol to open the calculator</span>`
            );
            marker.on('click', () => {
                openPortModal(port);
            });
            portLayer.addLayer(marker);
        });
        portLayer.addTo(map);
    }

    // Init layers.
    // Tuning notes:
    //   radius=17, blur=12 keep clusters compact at zoom 4-6 and prevent
    //     single observations from inflating into open-ocean ghosts.
    //   minOpacity=0.05 lets isolated points fade out below visibility while
    //     the gradient's first stop still defines colour for real clusters.
    const heatLayer = L.heatLayer([], {
        radius: 17,
        blur: 12,
        maxZoom: 11,
        max: 0.6,
        minOpacity: 0.05,
        gradient: {
            0.1: '#071722', 0.25: '#125374', 0.4: '#168ba4',
            0.58: '#55d8d2', 0.75: '#b1fff1', 0.92: '#ffb25c', 1.0: '#fff4d8',
        },
    }).addTo(map);

    const pointsLayer = L.layerGroup();

    initUI({
        map, heatLayer, pointsLayer, allData,
        currentView: 'heatmap',
        regionLayer, confidenceMode: false,
    });

    applyFilters();

    // Event listeners.
    document.getElementById('species-filter').addEventListener('change', applyFilters);
    document.getElementById('month-slider').addEventListener('input', applyFilters);
    document.getElementById('port-toggle').addEventListener('change', () => togglePorts(portLayer));
    document.getElementById('ship-toggle').addEventListener('change', (e) => {
        const on = e.target.checked;
        if (on) { map.addLayer(shipDensityLayer); }
        else { map.removeLayer(shipDensityLayer); }
        document.body.classList.toggle('ship-active', on);
        const shipLegend = document.getElementById('ship-density-legend');
        if (shipLegend) shipLegend.hidden = !on;
    });
    document.getElementById('confidence-toggle').addEventListener('change', () => {
        toggleConfidence(document.getElementById('confidence-toggle').checked);
    });

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => setView(btn.dataset.view));
    });

    document.querySelector('.info-btn').addEventListener('click', () => {
        document.getElementById('info-modal').classList.add('open');
    });

    // Species list click delegation.
    document.getElementById('species-list').addEventListener('click', (e) => {
        const item = e.target.closest('.species-item');
        if (!item) return;
        const species = item.dataset.species;
        if (!species) return;
        const sel = document.getElementById('species-filter');
        sel.value = species;
        applyFilters();
    });

    // Region modal: speed slider listener attached once.
    const regionSpeed = document.getElementById('region-speed');
    let currentRegionLayer = null;
    let regionDebounce = null;

    function recalculateRegion() {
        if (!currentRegionLayer) return;
        const speedKn = parseFloat(regionSpeed.value);
        document.getElementById('region-speed-display').textContent =
            `${speedKn.toFixed(0)} kn  ·  ${(speedKn * KNOT_TO_KMH).toFixed(1)} km/h`;

        const lethal = pLethalVT2007(speedKn);
        document.getElementById('region-lethal').textContent =
            `${(lethal * 100).toFixed(0)}%`;
        const lethalEl = document.getElementById('region-lethal');
        lethalEl.style.color = lethal > 0.7 ? '#ff6b6b'
            : lethal > 0.3 ? '#fbc02d' : '#4dd0e1';

        const filtered = getFilteredData();
        const result = scoreRegion(currentRegionLayer, filtered, speedKn);
        const risk = riskLabel(result.normScore);

        document.getElementById('region-stats').textContent =
            `${result.observationCount.toLocaleString()} observations · ${result.speciesCount} species`;

        const confEl = document.getElementById('region-confidence');
        if (result.observationCount === 0) {
            confEl.style.display = 'block';
            confEl.className = 'confidence-warning severe';
            confEl.textContent = 'No observation data in this region with current filters.';
        } else if (result.observationCount < 30) {
            confEl.style.display = 'block';
            confEl.className = 'confidence-warning';
            confEl.textContent = `Low data confidence: only ${result.observationCount} observations.`;
        } else {
            confEl.style.display = 'none';
        }

        const riskEl = document.getElementById('region-risk');
        if (result.observationCount === 0) {
            riskEl.innerHTML = '<span class="region-empty">No data</span>';
        } else {
            riskEl.innerHTML = `<span style="color:${risk.color}">${risk.text}</span>`;
        }

        const sorted = Object.entries(result.riskSpecies)
            .sort((a, b) => {
                const rlOrder = { CR: 0, EN: 1, VU: 2, NT: 3, DD: 4, LC: 5 };
                const rlA = a[1].rl; const rlB = b[1].rl;
                if (rlA && !rlB) return -1;
                if (!rlA && rlB) return 1;
                if (rlA && rlB) return (rlOrder[rlA] ?? 9) - (rlOrder[rlB] ?? 9);
                return b[1].count - a[1].count;
            })
            .slice(0, 12);

        const headerHtml = '<div style="font-size:11px;color:#8b9bb1;margin:8px 0 6px 0">' +
            'Vulnerable species in region ' +
            '<span style="font-size:10px">(' +
            '<span style="color:#8b0000">CR</span>, ' +
            '<span style="color:#d32f2f">EN</span>, ' +
            '<span style="color:#f57c00">VU</span>, ' +
            '<span style="color:#fbc02d">NT</span>; ' +
            '&#9650; high strike risk, &#9679; medium)' +
            '</span></div>';

        const listEl = document.getElementById('region-species-list');
        if (sorted.length === 0 && result.observationCount > 0) {
            listEl.innerHTML = '<div class="region-empty">No vulnerable species in this region.</div>';
        } else if (sorted.length === 0) {
            listEl.innerHTML = '';
        } else {
            listEl.innerHTML = headerHtml + sorted.map(([sp, d]) => {
                const cat = d.rl ? RED_LIST_CATEGORIES[d.rl] : null;
                const badge = cat ? `<span style="color:${cat.color};font-weight:700" title="${cat.label}">${d.rl}</span> ` : '';
                const riskMark = d.risk === 'high'
                    ? ' <span style="color:#ff6b6b" title="High strike vulnerability">&#9650;</span>'
                    : d.risk === 'medium'
                        ? ' <span style="color:#fbc02d" title="Moderate strike vulnerability">&#9679;</span>'
                        : '';
                const cn = COMMON_NAMES[sp];
                const cnText = cn ? `<span style="color:#8b9bb1;font-size:10px"> · ${escapeHtml(cn.en)}</span>` : '';
                return `<div class="risk-species-item">
                    <span class="species-info">${badge}<i>${escapeHtml(sp)}</i>${riskMark}${cnText}</span>
                    <span class="obs-count">${d.count} obs</span>
                </div>`;
            }).join('');
        }
    }

    function debouncedRecalculate() {
        clearTimeout(regionDebounce);
        regionDebounce = setTimeout(recalculateRegion, 100);
    }

    regionSpeed.addEventListener('input', debouncedRecalculate);

    function openRegionModal(layer, name) {
        currentRegionLayer = layer;
        document.getElementById('region-name').textContent = name;
        regionSpeed.value = DEFAULT_SHIP_SPEED_KN;
        recalculateRegion();
        document.getElementById('region-modal').classList.add('open');
    }

    // Port modal (similar but per port, not per region).
    const portSpeed = document.getElementById('port-speed');
    let currentPort = null;
    let portDebounce = null;

    function recalculatePort() {
        if (!currentPort) return;
        const speedKn = parseFloat(portSpeed.value);
        document.getElementById('port-speed-display').textContent =
            `${speedKn.toFixed(0)} kn  ·  ${(speedKn * KNOT_TO_KMH).toFixed(1)} km/h`;

        const lethal = pLethalVT2007(speedKn);
        const lethalEl = document.getElementById('port-lethal');
        lethalEl.textContent = `${(lethal * 100).toFixed(0)}%`;
        lethalEl.style.color = lethal > 0.7 ? '#ff6b6b'
            : lethal > 0.3 ? '#fbc02d' : '#4dd0e1';

        const result = scorePort(currentPort, allData, speedKn);
        const risk = riskLabel(result.normScore);
        document.getElementById('port-stats').textContent =
            `${result.nearbyCount.toLocaleString()} cetacean observations within 30 km.`;
        const riskEl = document.getElementById('port-risk');
        riskEl.innerHTML = `<span style="color:${risk.color}">${risk.text}</span>`;

        const sorted = Object.entries(result.riskSpecies)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 10);
        const listEl = document.getElementById('port-species-list');
        if (sorted.length === 0) {
            listEl.innerHTML = '<div class="region-empty">No vulnerable species nearby.</div>';
        } else {
            listEl.innerHTML = sorted.map(([sp, d]) => {
                const cat = d.rl ? RED_LIST_CATEGORIES[d.rl] : null;
                const badge = cat ? `<span style="color:${cat.color};font-weight:700">${d.rl}</span> ` : '';
                const riskMark = d.risk === 'high' ? ' <span style="color:#ff6b6b">&#9650;</span>'
                    : d.risk === 'medium' ? ' <span style="color:#fbc02d">&#9679;</span>' : '';
                const cn = COMMON_NAMES[sp];
                const cnText = cn ? `<span style="color:#8b9bb1;font-size:10px"> · ${escapeHtml(cn.en)}</span>` : '';
                return `<div class="risk-species-item">
                    <span class="species-info">${badge}<i>${escapeHtml(sp)}</i>${riskMark}${cnText}</span>
                    <span class="obs-count">${d.count} obs</span>
                </div>`;
            }).join('');
        }
    }

    portSpeed.addEventListener('input', () => {
        clearTimeout(portDebounce);
        portDebounce = setTimeout(recalculatePort, 100);
    });

    function openPortModal(port) {
        currentPort = port;
        document.getElementById('port-name').textContent = port.name;
        document.getElementById('port-meta').textContent =
            `${port.type} · ${port.throughput_mt} Mt/yr · ${port.lat.toFixed(2)}, ${port.lon.toFixed(2)}`;
        portSpeed.value = DEFAULT_SHIP_SPEED_KN;
        recalculatePort();
        document.getElementById('port-modal').classList.add('open');
    }
});

// Global event listeners (need to work before data loads).
document.getElementById('hide-ui-btn').addEventListener('click', toggleUI);
document.getElementById('theme-btn').addEventListener('click', toggleTheme);

['info-modal', 'region-modal', 'port-modal'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('click', function (e) { if (e.target === this) this.classList.remove('open'); });
});

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById(btn.dataset.modal).classList.remove('open');
    });
});

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
        return;
    }
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'h' || e.key === 'H') toggleUI();
    if (e.key === 't' || e.key === 'T') toggleTheme();
});
