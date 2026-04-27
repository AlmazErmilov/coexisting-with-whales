// Pure functions: collision-risk calculation, geo helpers, port and region scoring.
// Zero DOM access, fully testable.
//
// Formulas
//
//   pLethalVT2007(v_knots)
//       Vanderlaan & Taggart (2007), Marine Mammal Science 23(1):144-156.
//       doi:10.1111/j.1748-7692.2006.00098.x
//       P_lethal(v) = 1 / (1 + exp(-(beta0 + beta1 * v)))
//       beta0 = -4.89, beta1 = 0.41 (simple logistic estimate, p=0.013/0.003).
//       Reference behaviour: P=0.5 at v=11.8 kn, P=0.21 at 8.6 kn, P=0.79 at 15 kn.
//
//   cellRisk(whaleDensity, shipDensity)
//       Williams & O'Hara (2010), JCRM 11(1):1-8.
//       Relative co-occurrence index for a grid cell.
//
//   expectedLethalStrikes
//       Rockwood, Calambokidis & Jahncke (2017), PLOS ONE 12(8):e0183052.
//       doi:10.1371/journal.pone.0183052
//       Encounter rate * P(strike depth) * (1 - P(avoidance)) * P(mortality).

import {
    RED_LIST, IUCN, RED_LIST_CATEGORIES, STRIKE_RISK, SEASONALITY,
    SEARCH_RADIUS_KM, SCORE_NORMALIZATION, REGION_SCORE_NORMALIZATION,
    DEFAULT_SHIP_SPEED_KN, KNOT_TO_KMH, bestStatus,
} from './data.js';

// ---------- Geometry ----------

// Ray-casting point-in-polygon for GeoJSON rings (coordinates are [lon, lat]).
export function pointInRing(lat, lon, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const yi = ring[i][1], xi = ring[i][0];
        const yj = ring[j][1], xj = ring[j][0];
        if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }
    return inside;
}

export function pointInFeature(lat, lon, geometry) {
    if (geometry.type === 'Polygon') {
        if (!pointInRing(lat, lon, geometry.coordinates[0])) return false;
        for (let i = 1; i < geometry.coordinates.length; i++) {
            if (pointInRing(lat, lon, geometry.coordinates[i])) return false;
        }
        return true;
    } else if (geometry.type === 'MultiPolygon') {
        for (const poly of geometry.coordinates) {
            if (pointInRing(lat, lon, poly[0])) {
                let inHole = false;
                for (let i = 1; i < poly.length; i++) {
                    if (pointInRing(lat, lon, poly[i])) { inHole = true; break; }
                }
                if (!inHole) return true;
            }
        }
        return false;
    }
    return false;
}

// Flat-Earth approximation. Accurate to within ~10% in Norwegian latitudes
// (58-82 N) at distances under ~200 km. Same approach as the birds project.
export function distanceKm(lat1, lon1, lat2, lon2) {
    const dlat = (lat2 - lat1) * 111;
    const dlon = (lon2 - lon1) * 111 * Math.cos(lat1 * Math.PI / 180);
    return Math.sqrt(dlat * dlat + dlon * dlon);
}

// ---------- Collision-risk physics (peer-reviewed) ----------

// Vanderlaan & Taggart (2007). P(lethal) given a vessel speed in knots.
export function pLethalVT2007(speedKnots) {
    const b0 = -4.89, b1 = 0.41;
    return 1 / (1 + Math.exp(-(b0 + b1 * speedKnots)));
}

// Conn & Silber (2013) re-fit (placeholder coefficients - see refs/note in
// REFS['conn-2013']). The shape is identical, the slope is gentler.
export function pLethalCS2013(speedKnots, alpha = -3.0, beta = 0.20) {
    return 1 / (1 + Math.exp(-(alpha + beta * speedKnots)));
}

// Williams & O'Hara (2010). Relative co-occurrence risk index for a cell.
export function cellRisk(whaleDensity, shipDensity) {
    return whaleDensity * shipDensity;
}

// Rockwood et al. (2017). Per-cell expected lethal strikes per unit time.
// Inputs are SI units (m, m/s, m^2, s) so callers must convert from knots/km.
export function expectedLethalStrikes({
    whaleDensity, shipDensity, cellAreaM2,
    vesselSpeedMs, whaleSpeedMs,
    whaleLengthM, shipBeamM,
    pStrikeDepth = 0.5, pAvoidance = 0,
    pMortality = pLethalVT2007,
    durationSec,
}) {
    const rc = (whaleLengthM + shipBeamM) / 2;                    // critical encounter radius (m)
    const lambdaPerPair = (2 * rc * (vesselSpeedMs + whaleSpeedMs)) / cellAreaM2; // per-pair encounter rate
    const speedKnots = vesselSpeedMs * 1.94384;
    const nWhales = whaleDensity * cellAreaM2;
    const nShips  = shipDensity  * cellAreaM2;
    const encounters = lambdaPerPair * nWhales * nShips * durationSec;
    return encounters * pStrikeDepth * (1 - pAvoidance) * pMortality(speedKnots);
}

// ---------- Risk classification per species ----------

// Returns 'high' / 'medium' / 'low' based on the curated STRIKE_RISK table
// (data.js). Rationale: large slow surface-occupying whales are most exposed.
export function getStrikeRisk(species) {
    return STRIKE_RISK[species] || 'low';
}

// Returns true if the species is regularly present in a given month.
// month=1..12 or 0 (any). Falls back to 'true' if no data on seasonality.
export function inSeason(species, month) {
    if (!month) return true;
    const months = SEASONALITY[species];
    if (!months) return true;
    return months.includes(month);
}

// ---------- Aggregate scoring ----------

// Per-port score: similar to the birds project's per-park score, with the
// vessel-strike multiplier replacing the rotor-zone multiplier.
//
// score = sum over nearby observations of:
//     base 1
//   * red-list weight (CR=8, EN=5, VU=3, NT=1.5, DD=1.5, LC=1)
//   * strike-risk multiplier (high=3, medium=1.5, low=1)
//   * P_lethal(speedKnots) / P_lethal(default) - relative speed factor
//
// The speed factor lets the calculator change as the user moves a speed
// slider for the port modal. The default (14 kn) gives factor = 1.
export function scorePort(port, observations, speedKnots = DEFAULT_SHIP_SPEED_KN) {
    const nearby = observations.filter(o =>
        distanceKm(port.lat, port.lon, o.lat, o.lon) < SEARCH_RADIUS_KM
    );

    const speedFactor = pLethalVT2007(speedKnots) / pLethalVT2007(DEFAULT_SHIP_SPEED_KN);

    const threatened = new Set(['CR', 'EN', 'VU', 'NT', 'DD']);
    let score = 0;
    const riskSpecies = {};
    nearby.forEach(o => {
        const rl = bestStatus(o.species);
        const risk = getStrikeRisk(o.species);
        const isThreatened = rl && threatened.has(rl);
        const isAtRisk = risk === 'high' || risk === 'medium';
        // Only species that pose a meaningful conservation concern contribute.
        // LC species without strike risk (porpoises, dolphins) are reported in
        // nearbyCount but don't inflate the score.
        if (!isThreatened && !isAtRisk) return;
        let w = 1;
        if (isThreatened) w *= (RED_LIST_CATEGORIES[rl]?.weight || 1);
        if (risk === 'high') w *= 3;
        else if (risk === 'medium') w *= 1.5;
        w *= speedFactor;
        score += w;
        if (!riskSpecies[o.species]) riskSpecies[o.species] = { count: 0, rl, risk };
        riskSpecies[o.species].count++;
    });

    const normScore = Math.min(1, score / SCORE_NORMALIZATION);
    return { normScore, riskSpecies, nearbyCount: nearby.length, speedFactor };
}

// Per-region score (analogous to the birds project's per-kommune score).
// Counts unique species, not raw observations - one persistent humpback should
// not outweigh a single rare blue whale.
export function scoreRegion(regionLayerRef, filteredData, speedKnots = DEFAULT_SHIP_SPEED_KN) {
    const obs = filteredData.filter(o => o._region === regionLayerRef);

    const speciesMap = {};
    obs.forEach(o => {
        if (!speciesMap[o.species]) {
            speciesMap[o.species] = {
                count: 0,
                rl: bestStatus(o.species),
                risk: getStrikeRisk(o.species),
            };
        }
        speciesMap[o.species].count++;
    });

    const speedFactor = pLethalVT2007(speedKnots) / pLethalVT2007(DEFAULT_SHIP_SPEED_KN);

    let score = 0;
    const riskSpecies = {};
    const threatened = new Set(['CR', 'EN', 'VU', 'NT', 'DD']);
    for (const [species, d] of Object.entries(speciesMap)) {
        const isThreatened = d.rl && threatened.has(d.rl);
        const isAtRisk = d.risk === 'high' || d.risk === 'medium';
        if (!isThreatened && !isAtRisk) continue;
        let w = 1;
        if (isThreatened) w *= (RED_LIST_CATEGORIES[d.rl]?.weight || 1);
        if (d.risk === 'high') w *= 3;
        else if (d.risk === 'medium') w *= 1.5;
        w *= speedFactor;
        score += w;
        riskSpecies[species] = d;
    }

    return {
        normScore: Math.min(1, score / REGION_SCORE_NORMALIZATION),
        riskSpecies,
        observationCount: obs.length,
        speciesCount: Object.keys(speciesMap).length,
        speedFactor,
    };
}

// ---------- Visual mapping ----------

// Green (low) -> yellow -> red (high) - same scheme as the birds project.
export function scoreToColor(normScore) {
    const r = Math.round(normScore > 0.5 ? 255 : normScore * 2 * 255);
    const g = Math.round(normScore < 0.5 ? 180 : (1 - normScore) * 2 * 180);
    return `rgb(${r},${g},80)`;
}

export function riskLabel(normScore) {
    if (normScore < 0.2) return { text: 'Low strike risk', color: '#4dd0e1' };
    if (normScore < 0.5) return { text: 'Moderate strike risk', color: '#fbc02d' };
    if (normScore < 0.75) return { text: 'High strike risk', color: '#ff6b6b' };
    return { text: 'Very high strike risk', color: '#ff6b6b' };
}

// Deterministic hash-based color for species (HSL for stable spread).
export function speciesColor(species) {
    let hash = 0;
    for (let i = 0; i < species.length; i++) {
        hash = species.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 70%, 60%)`;
}

// Convenience: convert knots to km/h (used by the speed slider display).
export function knotsToKmh(kn) {
    return kn * KNOT_TO_KMH;
}
