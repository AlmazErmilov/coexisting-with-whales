import { COMMON_NAMES, SLOW_ZONE_SHIP_SPEED_KN, escapeHtml } from './data.js';
import { pLethalVT2007 } from './scoring.js';

let sequence = 0;
let introController = null;
let introPending = false;

// ASVS 2.1.1 / 2.2.1: supported UI range is 6–22 kn, not a model validity claim.
// Accept numbers and plain decimal slider strings. Never coerce objects or booleans.
function vesselSpeed(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && (value.length > 32 || !/^\d+(?:\.\d+)?$/.test(value.trim()))) return null;
    const speed = Number(value);
    return Number.isFinite(speed) && speed >= 6 && speed <= 22 ? speed : null;
}

const percent = probability => `${(probability * 100).toFixed(1)}%`;
const speedText = speed => Number(speed.toFixed(2)).toString();

// A generic large whale, with paired flukes, dorsal ridge and pectoral fin.
// Geometry is decorative, with no depth, length or habitat scale.
function whaleDrawing() {
    return `<path class="ocean-whale" d="M46 48C31 43 15 29 4 8C28 9 44 21 51 33C54 17 67 6 85 4C84 23 73 38 62 48C109 34 145 24 184 29L204 16L209 30C252 27 287 39 302 52C310 60 300 70 277 75C254 81 230 81 210 79C200 96 176 114 150 110L173 77C128 73 91 68 61 58C45 69 28 75 10 68C24 55 35 50 46 48Z"/><path class="ocean-whale__detail" d="M224 68Q261 74 290 62M222 75Q247 82 270 76"/><circle class="ocean-whale__eye" cx="278" cy="51" r="2"/>`;
}

function vesselDrawing() {
    return `<path class="ocean-vessel" d="M0 37H168L151 66H24Z M27 37V16H66V37 M36 16V4H56V16 M78 37V22H103V37 M107 37V22H132V37"/><path class="ocean-vessel__detail" d="M34 24H59 M78 30H132 M22 48H151"/>`;
}

function exposureDrawing(id) {
    return `<svg class="ocean-diagram__scene" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 148" role="img" aria-labelledby="${id}-scene-title ${id}-scene-desc">
        <title id="${id}-scene-title">Illustrative vessel and whale intersection</title>
        <desc id="${id}-scene-desc">A vessel at the surface and a whale below. Hatching indicates an illustrative intersection, not a measured collision exposure or depth band. Not to scale.</desc>
        <defs><pattern id="${id}-hatch" width="6" height="6" patternUnits="userSpaceOnUse"><path class="ocean-hatch" d="M0 6L6 0"/></pattern></defs>
        <path class="ocean-surface" d="M12 52H308"/>
        <g transform="translate(165 15) scale(.78)">${vesselDrawing()}</g>
        <g transform="translate(40 50) scale(.76)">${whaleDrawing()}</g>
        <ellipse class="ocean-intersection" cx="200" cy="71" rx="24" ry="12" fill="url(#${id}-hatch)"/>
        <text x="12" y="40">Surface</text><text x="12" y="139">Illustrative · not to scale</text>
    </svg>`;
}

/**
 * Complete responsive figure, safe to replace on a slider change.
 * speed: finite number or decimal string, inclusive 6–22 knots. Invalid values
 * produce an unavailable notice, never a fallback forecast or a model curve.
 * species: scientific name or array of names, used only as display context.
 */
export function oceanDiagram(options = {}) {
    options = options && typeof options === 'object' ? options : {};
    const speed = vesselSpeed(options.speed);
    const id = `ocean-visual-${++sequence}`;
    // ASVS 1.2.1: encode all caller text at the HTML/SVG output boundary.
    const heading = escapeHtml(typeof options.title === 'string' && options.title.trim()
        ? options.title : 'Vessel speed & whales');
    if (speed === null) {
        return `<figure class="ocean-diagram" aria-labelledby="${id}-heading"><figcaption class="ocean-diagram__heading" id="${id}-heading">${heading}</figcaption><p class="ocean-diagram__notice">Vessel speed unavailable. Choose a finite speed from 6 to 22 kn to show the conditional fatal-injury curve.</p></figure>`;
    }
    const inputNames = typeof options.species === 'string' ? [options.species] : options.species;
    const names = Array.isArray(inputNames)
        ? [...new Set(inputNames.filter(name => typeof name === 'string' && name.trim()).map(name => name.trim()))] : [];
    const lethal = pLethalVT2007(speed);
    const comparisonSpeed = SLOW_ZONE_SHIP_SPEED_KN;
    const comparison = pLethalVT2007(comparisonSpeed);
    const x = v => 42 + (v - 6) / 16 * 252;
    const y = probability => 200 - probability * 156;
    const point = (v, p) => `${x(v).toFixed(2)} ${y(p).toFixed(2)}`;
    const curve = Array.from({ length: 129 }, (_, i) => {
        const v = 6 + i / 8;
        return `${i ? 'L' : 'M'}${point(v, pLethalVT2007(v))}`;
    }).join(' ');
    const rows = names.map(name => {
        const common = Object.hasOwn(COMMON_NAMES, name) ? COMMON_NAMES[name].en : null;
        return `<li>${common ? `<strong>${escapeHtml(common)}</strong> ` : ''}<i>${escapeHtml(name)}</i></li>`;
    }).join('');

    return `<figure class="ocean-diagram" aria-labelledby="${id}-heading">
        <figcaption class="ocean-diagram__heading" id="${id}-heading">${heading}<span>Conditional fatal injury · given a collision</span></figcaption>
        ${exposureDrawing(id)}
        <dl class="ocean-readouts">
            <div class="ocean-readouts__current"><dt>Vessel speed</dt><dd>${speedText(speed)} kn</dd><small>${percent(lethal)} conditional fatal injury</small></div>
            <div class="ocean-readouts__comparison"><dt>${comparisonSpeed} kn comparison</dt><dd>${percent(comparison)}</dd><small>Conditional fatal injury</small></div>
        </dl>
        <svg class="ocean-diagram__curve" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 250" role="img" aria-labelledby="${id}-curve-title ${id}-curve-desc">
            <title id="${id}-curve-title">Fatal injury given collision versus vessel speed</title>
            <desc id="${id}-curve-desc">Existing Vanderlaan and Taggart 2007 logistic model for large whales. At ${speedText(speed)} knots: ${percent(lethal)}. At ${comparisonSpeed} knots: ${percent(comparison)}. This is not encounter or collision probability and is not a per-species forecast.</desc>
            <text class="ocean-plot-label" x="42" y="24">Fatal injury given collision (%)</text>
            ${[0, .5, 1].map(p => `<g class="ocean-grid"><path d="M42 ${y(p)}H294"/><text x="32" y="${y(p) + 4}" text-anchor="end">${p * 100}</text></g>`).join('')}
            <path class="ocean-axis" d="M42 44V200H294"/>
            ${[6, 10, 14, 18, 22].map(v => `<g class="ocean-grid"><path d="M${x(v)} 200v5"/><text x="${x(v)}" y="222" text-anchor="middle">${v}</text></g>`).join('')}
            <text x="168" y="245" text-anchor="middle">Vessel speed (kn)</text>
            <path class="ocean-curve" d="${curve}"/>
            <path class="ocean-marker-guide ocean-marker-guide--comparison" d="M${x(comparisonSpeed)} ${y(comparison)}V200"/>
            <path class="ocean-marker-guide" d="M${x(speed)} ${y(lethal)}V200"/>
            <path class="ocean-marker-comparison" transform="translate(${point(comparisonSpeed, comparison)})" d="M0 -7L7 0L0 7L-7 0Z" data-speed="${comparisonSpeed}" data-probability="${comparison}"/>
            <circle class="ocean-marker-current" cx="${x(speed).toFixed(2)}" cy="${y(lethal).toFixed(2)}" r="4" data-speed="${speed}" data-probability="${lethal}"/>
        </svg>
        <div class="ocean-key"><span><b class="ocean-key__current"></b>Current${speed === comparisonSpeed ? ' = 10 kn' : ''}</span><span><b class="ocean-key__comparison"></b>10 kn comparison</span></div>
        <p class="ocean-diagram__caveat">Large-whale model, not a per-species forecast. This curve does not estimate encounter or collision probability.</p>
        ${rows ? `<details class="ocean-species"><summary>Selected species (${names.length})</summary><ul>${rows}</ul><p>Species are context only. The same large-whale curve is shown for every selection.</p></details>` : ''}
        <details class="ocean-method"><summary>Source & interpretation</summary><p><a href="https://doi.org/10.1111/j.1748-7692.2006.00098.x" target="_blank" rel="noopener noreferrer">Vanderlaan &amp; Taggart (2007)</a>. Existing app model: P = 1 / (1 + exp(4.89 − 0.41 × speed in kn)). No local encounter rate, avoidance, dive depth or habitat boundary is inferred. The 10 kn point is a comparison, not a safety threshold.</p></details>
    </figure>`;
}

function introDrawing(id, compact = false) {
    const width = compact ? 420 : 1000;
    const height = compact ? 380 : 450;
    const surface = compact ? 114 : 140;
    const shipX = compact ? 191 : 585;
    const shipScale = compact ? 1 : 1.7;
    const whaleX = compact ? 70 : 335;
    const whaleY = compact ? 111 : 139;
    const whaleScale = compact ? .9 : 1.5;
    const intersectX = compact ? 273 : 698;
    const intersectY = compact ? 137 : 181;
    const key = `${id}-${compact ? 'compact' : 'wide'}`;
    return `<svg class="ocean-intro__drawing ocean-intro__drawing--${compact ? 'compact' : 'wide'}" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">
        <defs><pattern id="${key}-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path class="ocean-intro__grid" d="M40 0H0V40"/></pattern><pattern id="${key}-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path class="ocean-hatch" d="M0 8L8 0"/></pattern></defs>
        <rect class="ocean-intro__grid-stage" x="20" y="24" width="${width - 40}" height="${height - 60}" fill="url(#${key}-grid)"/>
        <path class="ocean-intro__datum" d="M24 36V${height - 44} M20 ${surface}H${width - 20}"/>
        <text class="ocean-intro__label" x="34" y="${surface - 15}">SURFACE</text>
        <g transform="translate(${shipX} ${surface - 37 * shipScale}) scale(${shipScale})"><g class="ocean-intro__vessel">${vesselDrawing()}</g></g>
        <path class="ocean-intro__route" pathLength="1" d="${compact ? 'M50 279C116 286 124 220 179 208S245 158 273 137' : 'M86 348C230 366 270 300 405 287S626 215 698 181'}"/>
        <g transform="translate(${whaleX} ${whaleY}) scale(${whaleScale})"><g class="ocean-intro__whale">${whaleDrawing()}</g></g>
        <ellipse class="ocean-intersection ocean-intro__intersection" cx="${intersectX}" cy="${intersectY}" rx="${compact ? 34 : 62}" ry="${compact ? 17 : 26}" fill="url(#${key}-hatch)"/>
        <g class="ocean-intro__annotations"><path class="ocean-intro__leader" d="M${intersectX} ${intersectY + 18}L${compact ? 333 : 833} ${compact ? 265 : 330}H${width - 30}"/>
        <text class="ocean-intro__label" x="${compact ? 180 : 730}" y="${compact ? 292 : 359}">ILLUSTRATIVE INTERSECTION</text>
        <text class="ocean-intro__label" x="34" y="${height - 15}">SCHEMATIC · NOT TO SCALE</text></g>
    </svg>`;
}

/** Idempotent native dialog. Initial open expires after 8 s unless interacted
 * with; manual show/replay is persistent. No storage or media dependencies.
 */
export function initOceanIntro() {
    if (typeof document === 'undefined') return null;
    if (!document.body) {
        if (!introPending) {
            introPending = true;
            document.addEventListener('DOMContentLoaded', () => {
                introPending = false;
                initOceanIntro();
            }, { once: true });
        }
        return null;
    }
    if (introController?.element.isConnected) return introController;
    introController?.destroy();
    const root = document.createElement('div');
    root.className = 'ocean-intro';
    const id = `ocean-intro-${++sequence}`;
    root.innerHTML = `<section class="ocean-intro__card" id="${id}-card" role="dialog" aria-modal="true" aria-labelledby="${id}-title" aria-describedby="${id}-caption" tabindex="-1" hidden>
        <div class="ocean-intro__topline"><span>Coexisting with whales</span><button class="ocean-intro__close" type="button" aria-label="Dismiss introduction">×</button></div>
        <div class="ocean-intro__composition"><header><p class="ocean-intro__eyebrow">Norway · whales &amp; vessels</p><h2 id="${id}-title">Room to surface.</h2></header>
        ${introDrawing(id)}${introDrawing(id, true)}
        <footer><p>Shared waters.</p><button class="ocean-intro__explore" type="button">Explore the map <span aria-hidden="true">↗</span></button></footer></div>
        <small class="ocean-intro__caption" id="${id}-caption">Illustrative intersection · no depth scale</small>
    </section><button class="ocean-intro__replay" type="button" aria-label="Replay ocean introduction" aria-controls="${id}-card" aria-expanded="false">↻ <span>Ocean intro</span></button>`;
    const card = root.querySelector('.ocean-intro__card');
    const close = root.querySelector('.ocean-intro__close');
    const replay = root.querySelector('.ocean-intro__replay');
    const explore = root.querySelector('.ocean-intro__explore');
    let timer, previousFocus, overflowBefore;
    let destroyed = false;
    const inertBefore = new Map();
    const preserveInteraction = () => clearTimeout(timer);
    const restoreBackground = () => {
        for (const [element, wasInert] of inertBefore) element.inert = wasInert;
        inertBefore.clear();
        if (overflowBefore !== undefined) {
            document.body.style.overflow = overflowBefore;
            overflowBefore = undefined;
        }
    };
    const hide = () => {
        clearTimeout(timer);
        if (card.hidden) return;
        card.hidden = true;
        root.classList.remove('ocean-intro--open');
        replay.hidden = false;
        replay.setAttribute('aria-expanded', 'false');
        restoreBackground();
        if (previousFocus?.isConnected && previousFocus !== document.body && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll: true });
        else replay.focus({ preventScroll: true });
    };
    const lockBackground = () => {
        for (const element of document.body.children) {
            if (element === root || element.tagName === 'SCRIPT' || element.tagName === 'STYLE') continue;
            if (!inertBefore.has(element)) inertBefore.set(element, element.inert);
            element.inert = true;
        }
    };
    // Also cover UI mounted asynchronously during the initial introduction.
    const observer = new MutationObserver(() => { if (!card.hidden) lockBackground(); });
    const show = (automatic = false) => {
        if (destroyed) return;
        clearTimeout(timer);
        if (card.hidden) {
            previousFocus = document.activeElement;
            overflowBefore = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
        }
        lockBackground();
        card.hidden = false;
        root.classList.add('ocean-intro--open');
        card.classList.remove('ocean-intro__card--playing');
        void card.offsetWidth;
        card.classList.add('ocean-intro__card--playing');
        replay.hidden = true;
        replay.setAttribute('aria-expanded', 'true');
        close.focus({ preventScroll: true });
        if (automatic) timer = setTimeout(hide, 8000);
    };
    const onKey = event => {
        if (card.hidden) return;
        preserveInteraction();
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            hide();
        } else if (event.key === 'Tab') {
            if (event.shiftKey && (document.activeElement === close || document.activeElement === card)) {
                event.preventDefault(); explore.focus();
            } else if (!event.shiftKey && (document.activeElement === explore || document.activeElement === card)) {
                event.preventDefault(); close.focus();
            }
        }
    };
    const onFocus = event => {
        if (!card.hidden && !card.contains(event.target)) close.focus({ preventScroll: true });
    };
    const replayIntro = () => show(false);
    close.addEventListener('click', hide);
    explore.addEventListener('click', hide);
    replay.addEventListener('click', replayIntro);
    root.addEventListener('keydown', onKey);
    // Pointer movement alone does not disable the timed first open.
    for (const type of ['pointerdown', 'wheel', 'touchstart']) card.addEventListener(type, preserveInteraction, { passive: true });
    document.addEventListener('focusin', onFocus);
    document.body.append(root);
    observer.observe(document.body, { childList: true });
    introController = {
        element: root, show: () => show(false), hide,
        destroy() {
            hide();
            restoreBackground();
            destroyed = true;
            observer.disconnect();
            document.removeEventListener('focusin', onFocus);
            root.removeEventListener('keydown', onKey);
            close.removeEventListener('click', hide);
            explore.removeEventListener('click', hide);
            replay.removeEventListener('click', replayIntro);
            for (const type of ['pointerdown', 'wheel', 'touchstart']) card.removeEventListener(type, preserveInteraction);
            const replayFocused = document.activeElement === replay;
            root.remove();
            if (replayFocused && previousFocus?.isConnected && previousFocus !== replay && !previousFocus.closest('[inert]')) previousFocus.focus({ preventScroll: true });
            if (introController?.element === root) introController = null;
        },
    };
    show(true);
    return introController;
}
