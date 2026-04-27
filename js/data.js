// Constants and reference data for Coexisting with Whales

export const MONTH_NAMES = [
    'All months', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Norwegian Red List 2021 (Artsdatabanken) for cetaceans.
// Verified entries cite Artsdatabanken; unverified species default to LC per the
// summary that 27/71 mammal species are red-listed and most cetacean threatened
// entries concentrate on Arctic and great whales.
// CR/EN/VU/NT use the same letters as the IUCN framework. NA = not applicable
// (used for vagrants and species without reproduction in NO waters).
export const RED_LIST = {
    // CR (functionally absent from NE Atlantic, but listed for completeness)
    'Eubalaena glacialis': 'CR',
    // EN (verified, Artsdatabanken 2021)
    'Delphinapterus leucas': 'EN',     // Beluga, Svalbard pop ~549
    'Balaena mysticetus': 'EN',        // Bowhead, Spitsbergen stock
    'Balaenoptera musculus': 'EN',     // Blue whale
    // VU (verified, Artsdatabanken 2021)
    'Monodon monoceros': 'VU',         // Narwhal, Svalbard
    // NT (IUCN global; Artsdatabanken assigns NA on national list because
    // the species does not reproduce in mainland Norwegian waters)
    'Hyperoodon ampullatus': 'NT',
};

// Global IUCN Red List status (used as fallback when not nationally listed)
export const IUCN = {
    'Phocoena phocoena': 'LC',
    'Lagenorhynchus albirostris': 'LC',
    'Lagenorhynchus acutus': 'LC',
    'Tursiops truncatus': 'LC',
    'Delphinus delphis': 'LC',
    'Grampus griseus': 'LC',
    'Stenella coeruleoalba': 'LC',
    'Orcinus orca': 'DD',
    'Globicephala melas': 'LC',
    'Hyperoodon ampullatus': 'NT',
    'Mesoplodon bidens': 'LC',
    'Ziphius cavirostris': 'LC',
    'Physeter macrocephalus': 'VU',
    'Monodon monoceros': 'LC',
    'Delphinapterus leucas': 'LC',
    'Balaena mysticetus': 'LC',         // Spitsbergen subpop CR
    'Eubalaena glacialis': 'CR',
    'Balaenoptera musculus': 'EN',
    'Balaenoptera physalus': 'VU',
    'Balaenoptera borealis': 'EN',
    'Balaenoptera acutorostrata': 'LC',
    'Megaptera novaeangliae': 'LC',
    'Pseudorca crassidens': 'NT',
    'Globicephala macrorhynchus': 'LC',
    'Kogia breviceps': 'LC',
};

// Consolidated red list category metadata (single source of truth for JS)
// Weights are multipliers used in collision-risk scoring (see scoring.js).
export const RED_LIST_CATEGORIES = {
    CR: { color: '#8b0000', label: 'Critically endangered', weight: 8 },
    EN: { color: '#d32f2f', label: 'Endangered', weight: 5 },
    VU: { color: '#f57c00', label: 'Vulnerable', weight: 3 },
    NT: { color: '#fbc02d', label: 'Near threatened', weight: 1.5 },
    DD: { color: '#888', label: 'Data deficient', weight: 1.5 },
    LC: { color: '#4caf50', label: 'Least concern', weight: 1 },
};

// English and Norwegian common names by scientific name.
export const COMMON_NAMES = {
    'Phocoena phocoena': { en: 'Harbour porpoise', no: 'Nise' },
    'Lagenorhynchus albirostris': { en: 'White-beaked dolphin', no: 'Kvitnos' },
    'Lagenorhynchus acutus': { en: 'Atlantic white-sided dolphin', no: 'Kvitskjeving' },
    'Tursiops truncatus': { en: 'Common bottlenose dolphin', no: 'Tumler' },
    'Delphinus delphis': { en: 'Short-beaked common dolphin', no: 'Vanlig delfin' },
    'Grampus griseus': { en: "Risso's dolphin", no: 'Rissodelfin' },
    'Stenella coeruleoalba': { en: 'Striped dolphin', no: 'Stripedelfin' },
    'Orcinus orca': { en: 'Killer whale (orca)', no: 'Spekkhogger' },
    'Globicephala melas': { en: 'Long-finned pilot whale', no: 'Grindhval' },
    'Hyperoodon ampullatus': { en: 'Northern bottlenose whale', no: 'Nebbhval' },
    'Mesoplodon bidens': { en: "Sowerby's beaked whale", no: 'Spisshval' },
    'Ziphius cavirostris': { en: "Cuvier's beaked whale", no: 'Goosenebbhval' },
    'Physeter macrocephalus': { en: 'Sperm whale', no: 'Spermhval' },
    'Monodon monoceros': { en: 'Narwhal', no: 'Narhval' },
    'Delphinapterus leucas': { en: 'Beluga (white whale)', no: 'Hvithval' },
    'Balaena mysticetus': { en: 'Bowhead whale', no: 'Gronlandshval' },
    'Eubalaena glacialis': { en: 'North Atlantic right whale', no: 'Nordkaper' },
    'Balaenoptera musculus': { en: 'Blue whale', no: 'Blahval' },
    'Balaenoptera physalus': { en: 'Fin whale', no: 'Finnhval' },
    'Balaenoptera borealis': { en: 'Sei whale', no: 'Seihval' },
    'Balaenoptera acutorostrata': { en: 'Common minke whale', no: 'Vagehval' },
    'Megaptera novaeangliae': { en: 'Humpback whale', no: 'Knolhval' },
    'Pseudorca crassidens': { en: 'False killer whale', no: 'Falsk spekkhogger' },
    'Globicephala macrorhynchus': { en: 'Short-finned pilot whale', no: 'Kortfinnet grindhval' },
    'Kogia breviceps': { en: 'Pygmy sperm whale', no: 'Dvergspermhval' },
};

// Vessel strike vulnerability per species. Drives the strike-risk multiplier in
// the conflict score. Based on Vanderlaan & Taggart 2007 (lethality-vs-speed
// curve), Laist et al. 2001 (species accounts), Rockwood et al. 2017
// (modelled mortality of large baleen whales), and the Nisi et al. 2024 global
// hotspot analysis. Categories:
//   high: large slow surface-occupying whales with high strike mortality.
//   medium: large but more agile, or partially overlapping shipping lanes.
//   low: agile small cetaceans, deep divers, or species largely outside lanes.
export const STRIKE_RISK = {
    'Eubalaena glacialis': 'high',
    'Balaenoptera musculus': 'high',
    'Balaenoptera physalus': 'high',
    'Megaptera novaeangliae': 'high',
    'Physeter macrocephalus': 'high',
    'Balaenoptera borealis': 'high',
    'Balaenoptera acutorostrata': 'medium',
    'Globicephala melas': 'medium',
    'Globicephala macrorhynchus': 'medium',
    'Hyperoodon ampullatus': 'low',
    'Orcinus orca': 'medium',
    'Mesoplodon bidens': 'low',
    'Ziphius cavirostris': 'low',
    'Balaena mysticetus': 'low',
    'Monodon monoceros': 'low',
    'Delphinapterus leucas': 'low',
    'Phocoena phocoena': 'low',
    'Lagenorhynchus albirostris': 'low',
    'Lagenorhynchus acutus': 'low',
    'Tursiops truncatus': 'low',
    'Delphinus delphis': 'low',
    'Grampus griseus': 'low',
    'Stenella coeruleoalba': 'low',
    'Pseudorca crassidens': 'low',
    'Kogia breviceps': 'low',
};

// Months when each species is regularly present in Norwegian waters
// (1=Jan to 12=Dec). Used by the seasonality filter and tooltips.
export const SEASONALITY = {
    'Phocoena phocoena': [1,2,3,4,5,6,7,8,9,10,11,12],     // year-round
    'Lagenorhynchus albirostris': [1,2,3,4,5,6,7,8,9,10,11,12],
    'Lagenorhynchus acutus': [1,2,3,4,5,6,7,8,9,10,11,12],
    'Tursiops truncatus': [4,5,6,7,8,9,10],                 // mostly North Sea, sporadic
    'Delphinus delphis': [5,6,7,8,9],                       // summer southern North Sea
    'Grampus griseus': [4,5,6,7,8,9,10],
    'Stenella coeruleoalba': [5,6,7,8,9],
    'Orcinus orca': [1,2,3,4,5,6,7,8,9,10,11,12],           // year-round, peak Oct-Feb herring
    'Globicephala melas': [1,2,3,4,5,6,7,8,9,10,11,12],
    'Hyperoodon ampullatus': [5,6,7,8,9,10],                // summer offshore
    'Mesoplodon bidens': [5,6,7,8,9,10],
    'Ziphius cavirostris': [5,6,7,8,9],
    'Physeter macrocephalus': [1,2,3,4,5,6,7,8,9,10,11,12], // year-round, peak Jun-Aug Andoya
    'Monodon monoceros': [1,2,3,4,5,6,7,8,9,10,11,12],      // Svalbard year-round
    'Delphinapterus leucas': [1,2,3,4,5,6,7,8,9,10,11,12],
    'Balaena mysticetus': [1,2,3,4,5,6,7,8,9,10,11,12],
    'Balaenoptera musculus': [4,5,6,7,8,9,10],              // Apr-Oct
    'Balaenoptera physalus': [5,6,7,8,9],                   // Jun-Sep main
    'Balaenoptera borealis': [6,7,8,9],
    'Balaenoptera acutorostrata': [4,5,6,7,8,9,10],
    'Megaptera novaeangliae': [1,6,7,8,9,11,12],            // summer Barents + winter herring fjords
    // vagrants / very rare: omitted (treated as no seasonality data)
};

// Typical cruising swim speed in km/h. Used in encounter-rate calculations
// where speeds matter. Source: Futurismo + IFAW species summaries cited in
// docs/species-list.md.
export const SWIM_SPEED_KMH = {
    'Phocoena phocoena': 8,
    'Lagenorhynchus albirostris': 12,
    'Lagenorhynchus acutus': 12,
    'Tursiops truncatus': 8,
    'Delphinus delphis': 12,
    'Grampus griseus': 8,
    'Stenella coeruleoalba': 12,
    'Orcinus orca': 9,
    'Globicephala melas': 8,
    'Hyperoodon ampullatus': 8,
    'Mesoplodon bidens': 8,
    'Ziphius cavirostris': 8,
    'Physeter macrocephalus': 10,
    'Monodon monoceros': 4,
    'Delphinapterus leucas': 6,
    'Balaena mysticetus': 4,
    'Eubalaena glacialis': 6,
    'Balaenoptera musculus': 11,
    'Balaenoptera physalus': 12,
    'Balaenoptera borealis': 11,
    'Balaenoptera acutorostrata': 8,
    'Megaptera novaeangliae': 7,
    'Pseudorca crassidens': 8,
    'Globicephala macrorhynchus': 8,
    'Kogia breviceps': 4,
};

// Default IMO ship-strike speed limit (knots) used as the calculator's
// initial value for the region modal. Based on NOAA seasonal management
// areas for North Atlantic right whales.
export const DEFAULT_SHIP_SPEED_KN = 14;
export const SLOW_ZONE_SHIP_SPEED_KN = 10;
export const KNOT_TO_KMH = 1.852;

// Search radius (km) around a port or cell when computing collision risk.
export const SEARCH_RADIUS_KM = 30;

// Empirical normalisation thresholds. Calibrated for 10K observation sample.
// Recalibrate if the dataset grows substantially.
export const SCORE_NORMALIZATION = 300;
export const REGION_SCORE_NORMALIZATION = 60;

export const MAX_RENDERED_POINTS = 5000;

export function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Helper: pick the most informative red-list status for display.
// Prefers the Norwegian list when assigned, else falls back to global IUCN.
export function bestStatus(species) {
    return RED_LIST[species] || IUCN[species] || null;
}
