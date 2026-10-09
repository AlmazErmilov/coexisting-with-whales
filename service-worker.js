/* Versioned, same-origin application snapshot. No third party tiles are stored.
 * ASVS 1.2.2: cache only an explicit allowlist of paths from our own origin.
 */
const VERSION = 'whales-749a31ebf0adc0df';
const SNAPSHOT_KEY = '__snapshot_info__';
const CORE = [
    "./",
    "index.html",
    "about.html",
    "docs/whale-images.html",
    "assets/whales/illustration-placeholder.svg",
    "assets/favicon.svg",
    "assets/whale-emblem.svg",
    "js/app.js",
    "js/city-labels.js",
    "js/data.js",
    "js/dialogs.js",
    "js/ocean-visual.js",
    "js/offline.js",
    "js/refs.js",
    "js/scoring.js",
    "js/ui.js",
    "js/whale-cards.js",
    "js/whale-images.js",
    "js/whale-info.js",
    "css/ocean-visual.css",
    "css/style.css",
    "data/cities_norway.json",
    "data/coastline.geojson",
    "data/eez.geojson",
    "data/ports.json",
    "data/sea_regions.geojson",
    "data/whales_norway.json",
    "fonts/RobotoMono-Bold.ttf",
    "fonts/RobotoMono-Light.ttf",
    "fonts/RobotoMono-Medium.ttf",
    "fonts/RobotoMono-Regular.ttf",
    "assets/vendor/leaflet-heat.js",
    "assets/vendor/leaflet/images/layers-2x.png",
    "assets/vendor/leaflet/images/layers.png",
    "assets/vendor/leaflet/leaflet.css",
    "assets/vendor/leaflet/leaflet.js"
];
// Photo paths are added when the thumbnail manifest is generated.
const PHOTOS = [
    "assets/whales/balaena-mysticetus.jpg",
    "assets/whales/balaenoptera-acutorostrata.jpg",
    "assets/whales/balaenoptera-musculus.jpg",
    "assets/whales/balaenoptera-physalus.jpg",
    "assets/whales/delphinapterus-leucas.jpg",
    "assets/whales/delphinus-delphis.jpg",
    "assets/whales/globicephala-melas.jpg",
    "assets/whales/grampus-griseus.jpg",
    "assets/whales/illustration-placeholder.svg",
    "assets/whales/lagenorhynchus-acutus.jpg",
    "assets/whales/lagenorhynchus-albirostris.jpg",
    "assets/whales/megaptera-novaeangliae.jpg",
    "assets/whales/orcinus-orca.jpg",
    "assets/whales/phocoena-phocoena.jpg",
    "assets/whales/physeter-macrocephalus.jpg",
    "assets/whales/tursiops-truncatus.jpg"
];
const urls = new Set([...CORE, ...PHOTOS].map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
    event.waitUntil((async () => {
        const cache = await caches.open(VERSION);
        try {
            // Atomic core install: a partial download must never replace a working snapshot.
            await cache.addAll(CORE.map(path => new Request(new URL(path, self.registration.scope), {cache: 'reload'})));
            await cache.put(SNAPSHOT_KEY, new Response(JSON.stringify({
                type: 'SNAPSHOT_READY', version: VERSION, savedAt: new Date().toISOString()
            }), {headers: {'Content-Type': 'application/json'}}));
            // Optional photos cannot prevent the core application from working offline.
            await Promise.allSettled(PHOTOS.map(path => cache.add(new Request(new URL(path, self.registration.scope), {cache: 'reload'}))));
        } catch (error) {
            await caches.delete(VERSION);
            throw error;
        }
    })());
});
self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(names.filter(name => name.startsWith('whales-') && name !== VERSION).map(name => caches.delete(name)));
        await self.clients.claim();
        const metadata = await (await caches.open(VERSION)).match(SNAPSHOT_KEY);
        if (metadata) {
            const info = await metadata.json();
            for (const client of await self.clients.matchAll()) client.postMessage(info);
        }
    })());
});
self.addEventListener('message', event => {
    if (event.data?.type === 'ACTIVATE_SNAPSHOT') { self.skipWaiting(); return; }
    if (event.data?.type !== 'SNAPSHOT_STATUS') return;
    event.waitUntil((async () => {
        const metadata = await (await caches.open(VERSION)).match(SNAPSHOT_KEY);
        if (metadata) event.source?.postMessage(await metadata.json());
    })());
});
self.addEventListener('fetch', event => {
    const key = new URL(event.request.url);
    key.search = '';
    if (event.request.method !== 'GET' || !urls.has(key.href)) return;
    event.respondWith((async () => {
        const cache = await caches.open(VERSION);
        const saved = await cache.match(key.href);
        if (saved) return saved;
        // A missing optional photo can still recover online. Never cache an error response.
        const response = await fetch(event.request);
        if (response.ok) await cache.put(key.href, response.clone());
        return response;
    })());
});
