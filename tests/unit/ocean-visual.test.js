import { describe, it, expect } from 'vitest';
import { oceanDiagram, initOceanIntro } from '../../js/ocean-visual.js';
import { pLethalVT2007 } from '../../js/scoring.js';

describe('oceanDiagram input boundary', () => {
    it.each([undefined, null, NaN, Infinity, -Infinity, -1, 0, 5.99, 22.01, 1e10,
        '', ' ', '14kn', '1e1', '0xe', '14<script>', true, false, [], {},
        { valueOf: () => 14 }, '1'.repeat(33)])('rejects unsupported speed %j without a model readout', speed => {
        const html = oceanDiagram({ speed });
        expect(html).toContain('Vessel speed unavailable');
        expect(html).not.toContain('data-probability');
        expect(html).not.toContain('class="ocean-curve"');
        expect(html).not.toMatch(/\b(?:NaN|Infinity)\b/);
    });

    it.each([6, 22, 14.5, '14.5', ' 10 ', '6.0'])('accepts supported finite speed %j', speed => {
        const html = oceanDiagram({ speed });
        expect(html).not.toContain('Vessel speed unavailable');
        expect(html).toContain(`data-speed="${Number(speed)}"`);
    });

    it('rejects missing options rather than inventing a default speed', () => {
        for (const options of [undefined, null, 14, '14']) {
            expect(oceanDiagram(options)).toContain('Vessel speed unavailable');
        }
    });

    it('escapes titles and species including SVG-breaking markup', () => {
        const malicious = '\"><script>alert(1)</script><img src=x onerror="bad">&\'';
        const html = oceanDiagram({ speed: 14, title: malicious, species: [malicious] });
        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<img');
        expect(html).toContain('&quot;&gt;&lt;script&gt;');
        expect(html).toContain('&amp;&#39;');
        expect(oceanDiagram({ speed: 'bad', title: malicious })).not.toContain('<script>');
    });

    it('normalizes duplicate names and does not treat prototype properties as species data', () => {
        const html = oceanDiagram({ speed: 14, species: [' Orcinus orca ', 'Orcinus orca', '', null, {}, 'constructor', '__proto__'] });
        expect(html).toContain('Selected species (3)');
        expect(html).toContain('Killer whale (orca)');
        expect(html).not.toContain('[object Object]');
        expect(html).not.toContain('undefined');
    });
});

describe('oceanDiagram conditional lethality', () => {
    it.each([6, 8.5, 10, 14, 18.5, 22])('uses the existing model at %s kn and the 10 kn comparison', speed => {
        const html = oceanDiagram({ speed, species: 'Phocoena phocoena' });
        expect(html).toContain(`data-speed="${speed}" data-probability="${pLethalVT2007(speed)}"`);
        expect(html).toContain(`data-speed="10" data-probability="${pLethalVT2007(10)}"`);
        expect(html).toContain(`${(pLethalVT2007(speed) * 100).toFixed(1)}%`);
        const current = html.match(/class="ocean-marker-current" cx="([\d.]+)" cy="([\d.]+)"/);
        expect(Number(current[1])).toBeCloseTo(42 + (speed - 6) / 16 * 252, 2);
        expect(Number(current[2])).toBeCloseTo(200 - pLethalVT2007(speed) * 156, 2);
    });

    it('samples a finite monotonic curve over the supported display range', () => {
        const html = oceanDiagram({ speed: 14 });
        const path = html.match(/class="ocean-curve" d="([^"]+)"/)[1];
        const points = [...path.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map(match => [Number(match[1]), Number(match[2])]);
        expect(points).toHaveLength(129);
        expect(points[0][0]).toBe(42);
        expect(points.at(-1)[0]).toBe(294);
        for (let i = 1; i < points.length; i++) {
            expect(points[i][0]).toBeGreaterThan(points[i - 1][0]);
            expect(points[i][1]).toBeLessThan(points[i - 1][1]);
            expect(points[i][1]).toBeGreaterThan(44);
        }
    });

    it('does not alter the model for small cetaceans or unknown selections', () => {
        const markers = species => oceanDiagram({ speed: 14, species }).match(/data-probability="[^"]+"/g);
        expect(markers(['Balaenoptera musculus'])).toEqual(markers(['Phocoena phocoena', 'unknown']));
        const html = oceanDiagram({ speed: 14, species: [] });
        expect(html).toContain('given a collision');
        expect(html).toContain('Large-whale model, not a per-species forecast');
        expect(html).toContain('does not estimate encounter or collision probability');
        expect(html).toContain('not a safety threshold');
        expect(html).toContain('Illustrative · not to scale');
        expect(html).toContain('https://doi.org/10.1111/j.1748-7692.2006.00098.x');
    });

    it('preserves decimal speed and explains coincident current and comparison markers', () => {
        expect(oceanDiagram({ speed: 14.5 })).toContain('14.5 kn');
        expect(oceanDiagram({ speed: 10 })).toContain('Current = 10 kn');
    });

    it('uses responsive SVGs and unique accessible ids on each render', () => {
        const a = oceanDiagram({ speed: 14 });
        const b = oceanDiagram({ speed: 14 });
        const aId = a.match(/aria-labelledby="([^"]+)-heading"/)[1];
        const bId = b.match(/aria-labelledby="([^"]+)-heading"/)[1];
        expect(aId).not.toBe(bId);
        expect(a).toContain('viewBox="0 0 320 250"');
        expect(a).toContain('viewBox="0 0 320 148"');
        expect(a).not.toMatch(/<svg[^>]+width="/);
        expect(a).toContain(`id="${aId}-curve-desc"`);
        expect(a).toContain(`url(#${aId}-hatch)`);
    });
});

describe('initOceanIntro outside the browser', () => {
    it('can be imported and called without DOM access', () => {
        expect(initOceanIntro()).toBeNull();
    });
});
