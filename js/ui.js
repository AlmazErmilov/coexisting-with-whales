// DOM updates: filters, species list, toggles.

import {
    RED_LIST, IUCN, RED_LIST_CATEGORIES, COMMON_NAMES, STRIKE_RISK,
    SEASONALITY, MONTH_NAMES, MAX_RENDERED_POINTS, escapeHtml, bestStatus,
} from './data.js';
import { getStrikeRisk, inSeason, speciesColor, pointInFeature } from './scoring.js';

// Filter predicates (pure functions, independently testable).
export const FILTER_PREDICATES = {
    'red-list': (d) => bestStatus(d.species) != null && bestStatus(d.species) !== 'LC',
    'threatened': (d) => ['CR', 'EN', 'VU'].includes(bestStatus(d.species)),
    'strike-risk': (d) => getStrikeRisk(d.species) === 'high' || getStrikeRisk(d.species) === 'medium',
    'great-whales': (d) => [
        'Balaenoptera musculus', 'Balaenoptera physalus', 'Balaenoptera borealis',
        'Megaptera novaeangliae', 'Physeter macrocephalus', 'Balaena mysticetus',
        'Eubalaena glacialis',
    ].includes(d.species),
};

// Shared state references (set by app.js via initUI).
let map, heatLayer, pointsLayer, allData, currentView, regionLayer, confidenceMode;
let lastFiltered = [];

export function initUI(state) {
    map = state.map;
    heatLayer = state.heatLayer;
    pointsLayer = state.pointsLayer;
    allData = state.allData;
    currentView = state.currentView;
    regionLayer = state.regionLayer;
    confidenceMode = state.confidenceMode;
}

export function updateState(key, value) {
    if (key === 'currentView') currentView = value;
    else if (key === 'regionLayer') regionLayer = value;
    else if (key === 'confidenceMode') confidenceMode = value;
    else if (key === 'allData') allData = value;
    else if (key === 'heatLayer') heatLayer = value;
    else if (key === 'pointsLayer') pointsLayer = value;
}

export function toggleUI() {
    const btn = document.getElementById('hide-ui-btn');
    document.body.classList.toggle('ui-hidden');
    const hidden = document.body.classList.contains('ui-hidden');
    btn.innerHTML = hidden
        ? 'Show UI <span class="shortcut">[H]</span>'
        : 'Hide UI <span class="shortcut">[H]</span>';
}

export function applyFilters() {
    const speciesFilter = document.getElementById('species-filter').value;
    const monthVal = parseInt(document.getElementById('month-slider').value);
    document.getElementById('month-label').textContent = MONTH_NAMES[monthVal];

    let filtered = allData;
    const predicate = FILTER_PREDICATES[speciesFilter];
    if (predicate) {
        filtered = filtered.filter(predicate);
    } else if (speciesFilter !== 'all') {
        filtered = filtered.filter(d => d.species === speciesFilter);
    }
    if (monthVal > 0) {
        filtered = filtered.filter(d => d.month === monthVal);
    }
    lastFiltered = filtered;

    document.getElementById('stat-obs').textContent = filtered.length.toLocaleString();
    document.getElementById('stat-species').textContent = new Set(filtered.map(d => d.species)).size;

    if (currentView === 'heatmap') {
        // Fourth-root dampening prevents visual washout when filtering to small subsets.
        const ratio = allData.length / Math.max(1, filtered.length);
        heatLayer.options.max = Math.min(4.0, 0.6 * Math.pow(ratio, 0.25));
        const heatPoints = filtered.map(d => [d.lat, d.lon, 1.0]);
        heatLayer.setLatLngs(heatPoints);
    }

    pointsLayer.clearLayers();
    if (currentView === 'points') {
        const speciesCounts = new Map();
        filtered.forEach(o => speciesCounts.set(o.species, (speciesCounts.get(o.species) || 0) + 1));

        const step = Math.max(1, Math.floor(filtered.length / MAX_RENDERED_POINTS));
        for (let i = 0; i < filtered.length; i += step) {
            const d = filtered[i];
            const marker = L.circleMarker([d.lat, d.lon], {
                radius: 4, color: '#fff',
                fillColor: speciesColor(d.species), fillOpacity: 0.85,
                weight: 1, opacity: 0.3,
            });
            const rl = bestStatus(d.species);
            const rlCat = rl ? RED_LIST_CATEGORIES[rl] : null;
            const rlHtml = rl
                ? `<br><span style="color:${rlCat.color};font-weight:700">${rl}</span> ${escapeHtml(rlCat.label)}`
                : '';
            const risk = getStrikeRisk(d.species);
            const riskHtml = risk === 'high'
                ? '<br><span style="color:#ff6b6b;font-weight:700">&#9650; High strike vulnerability</span>'
                : risk === 'medium'
                    ? '<br><span style="color:#fbc02d">&#9679; Moderate strike vulnerability</span>'
                    : '';
            const cn = COMMON_NAMES[d.species];
            const cnHtml = cn ? `<br><span style="color:#aaa;font-size:11px">${escapeHtml(cn.en)}${cn.no ? ' · ' + escapeHtml(cn.no) : ''}</span>` : '';

            const sCount = speciesCounts.get(d.species) || 0;
            const pct = (sCount / filtered.length * 100).toFixed(1);
            const region = d._region?.feature?.properties?.name || '';
            const statsHtml = `<br><span style="color:#888;font-size:11px;border-top:1px solid rgba(255,255,255,0.15);display:block;margin-top:4px;padding-top:4px">${region ? escapeHtml(region) + ' · ' : ''}${sCount} obs of this species in view (${pct}%)</span>`;

            marker.bindPopup(
                `<b style="font-style:italic">${escapeHtml(d.species)}</b>${cnHtml}${rlHtml}${riskHtml}` +
                `<br>Month: ${MONTH_NAMES[d.month] || '?'}` +
                (d.country ? `<br>Country: ${escapeHtml(d.country)}` : '') +
                (d.dataset ? `<br><span style="color:#888;font-size:10px">${escapeHtml(d.dataset)}</span>` : '') +
                statsHtml
            );
            pointsLayer.addLayer(marker);
        }
    }

    if (confidenceMode) {
        updateRegionDisplay(filtered);
    }

    updateSpeciesList(filtered);
}

export function updateSpeciesList(data) {
    const counts = {};
    data.forEach(d => { counts[d.species] = (counts[d.species] || 0) + 1; });
    const rlOrder = { 'CR': 0, 'EN': 1, 'VU': 2, 'NT': 3, 'DD': 4, 'LC': 5 };
    const sorted = Object.entries(counts).sort((a, b) => {
        const rlA = bestStatus(a[0]); const rlB = bestStatus(b[0]);
        if (rlA && !rlB) return -1;
        if (!rlA && rlB) return 1;
        if (rlA && rlB) return (rlOrder[rlA] ?? 9) - (rlOrder[rlB] ?? 9);
        return b[1] - a[1];
    }).slice(0, 20);

    const container = document.getElementById('species-list');
    container.innerHTML = sorted.map(([name, count]) => {
        const rl = bestStatus(name);
        const rlCat = rl ? RED_LIST_CATEGORIES[rl] : null;
        const badge = rl
            ? `<span class="rl-badge" style="background:${rlCat.color};" title="${escapeHtml(rlCat.label)}">${rl}</span>`
            : '';
        const risk = getStrikeRisk(name);
        const riskIcon = risk === 'high' ? '&#9650;' : risk === 'medium' ? '&#9679;' : '';
        const riskColor = risk === 'high' ? '#ff6b6b' : risk === 'medium' ? '#fbc02d' : '';
        const riskHtml = riskIcon
            ? `<span class="alt-tag" style="color:${riskColor}" title="Strike risk: ${risk}">${riskIcon}</span>`
            : '';
        return `
            <div class="species-item" data-species="${escapeHtml(name)}">
                <span class="species-name">${badge}${escapeHtml(name)}${riskHtml}</span>
                <span class="species-count">${count}</span>
            </div>`;
    }).join('');
}

export function setView(view) {
    currentView = view;
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'heatmap') {
        map.removeLayer(pointsLayer);
        map.addLayer(heatLayer);
    } else {
        map.removeLayer(heatLayer);
        map.addLayer(pointsLayer);
    }
    applyFilters();
}

export function togglePorts(portLayer) {
    const show = document.getElementById('port-toggle').checked;
    if (portLayer) {
        if (show) { map.addLayer(portLayer); }
        else { map.removeLayer(portLayer); }
    }
}

export function toggleShipDensity(shipLayer) {
    const show = document.getElementById('ship-toggle').checked;
    if (shipLayer) {
        if (show) { map.addLayer(shipLayer); }
        else { map.removeLayer(shipLayer); }
    }
}

export function updateRegionDisplay(filtered) {
    if (!regionLayer) return;
    const counts = new Map();
    filtered.forEach(o => {
        if (o._region) counts.set(o._region, (counts.get(o._region) || 0) + 1);
    });
    regionLayer.eachLayer(layer => {
        const count = counts.get(layer) || 0;
        const name = layer.feature.properties.name || layer.feature.properties.NAME || 'Sea region';
        let fillColor, fillOpacity;
        if (count === 0) {
            fillColor = '#555'; fillOpacity = 0.35;
        } else if (count < 50) {
            fillColor = '#d32f2f'; fillOpacity = 0.25;
        } else if (count < 250) {
            fillColor = '#f57c00'; fillOpacity = 0.2;
        } else if (count < 1000) {
            fillColor = '#fbc02d'; fillOpacity = 0.12;
        } else {
            fillColor = 'transparent'; fillOpacity = 0;
        }
        layer.setStyle({ fillColor, fillOpacity });
        layer.unbindTooltip();
        layer.bindTooltip(`${escapeHtml(name)} — ${count} observations`, {
            className: 'region-tooltip', sticky: true,
        });
    });
}

export function resetRegionDisplay() {
    if (!regionLayer) return;
    regionLayer.eachLayer(layer => {
        const name = layer.feature.properties.name || layer.feature.properties.NAME || 'Sea region';
        layer.setStyle({ fillColor: 'transparent', fillOpacity: 0 });
        layer.unbindTooltip();
        layer.bindTooltip(escapeHtml(name), {
            className: 'region-tooltip', sticky: true,
        });
    });
}

export function toggleConfidence(newVal) {
    confidenceMode = newVal;
    if (confidenceMode) {
        applyFilters();
    } else {
        resetRegionDisplay();
    }
}

export function getFilteredData() {
    return lastFiltered;
}
