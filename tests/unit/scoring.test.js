import { describe, it, expect } from 'vitest';
import {
    pointInRing, pointInFeature, distanceKm,
    pLethalVT2007, pLethalCS2013, cellRisk, expectedLethalStrikes,
    getStrikeRisk, inSeason,
    scorePort, scoreRegion, scoreToColor, riskLabel, speciesColor,
    knotsToKmh,
} from '../../js/scoring.js';

describe('pLethalVT2007', () => {
    it('returns ~0.5 at 11.8 knots (paper reference value)', () => {
        // The paper rounds the median to "11.8 knots". Exact β0/β1 puts it
        // at 11.93 kn, so 11.8 lands at ~0.487. Allow a wide margin.
        const p = pLethalVT2007(11.8);
        expect(p).toBeGreaterThan(0.45);
        expect(p).toBeLessThan(0.55);
    });

    it('returns ~0.21 at 8.6 knots', () => {
        const p = pLethalVT2007(8.6);
        expect(p).toBeGreaterThan(0.19);
        expect(p).toBeLessThan(0.23);
    });

    it('returns ~0.79 at 15 knots', () => {
        const p = pLethalVT2007(15);
        expect(p).toBeGreaterThan(0.77);
        expect(p).toBeLessThan(0.81);
    });

    it('approaches 0 for very low speeds', () => {
        expect(pLethalVT2007(0)).toBeLessThan(0.01);
    });

    it('approaches 1 for very high speeds', () => {
        expect(pLethalVT2007(30)).toBeGreaterThan(0.99);
    });

    it('is monotonically increasing', () => {
        let prev = -1;
        for (let v = 0; v <= 25; v += 1) {
            const p = pLethalVT2007(v);
            expect(p).toBeGreaterThan(prev);
            prev = p;
        }
    });
});

describe('pLethalCS2013', () => {
    it('returns probability between 0 and 1', () => {
        const p = pLethalCS2013(15);
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
    });

    it('is monotonically increasing', () => {
        expect(pLethalCS2013(20)).toBeGreaterThan(pLethalCS2013(10));
    });
});

describe('cellRisk', () => {
    it('multiplies whale and ship density', () => {
        expect(cellRisk(2, 3)).toBe(6);
    });
    it('returns zero when either density is zero', () => {
        expect(cellRisk(0, 5)).toBe(0);
        expect(cellRisk(5, 0)).toBe(0);
    });
});

describe('expectedLethalStrikes', () => {
    it('returns zero when whale density is zero', () => {
        const m = expectedLethalStrikes({
            whaleDensity: 0, shipDensity: 1e-7, cellAreaM2: 1e8,
            vesselSpeedMs: 7, whaleSpeedMs: 2,
            whaleLengthM: 20, shipBeamM: 30,
            durationSec: 86400,
        });
        expect(m).toBe(0);
    });

    it('grows with vessel speed', () => {
        const base = (vesselSpeedMs) => expectedLethalStrikes({
            whaleDensity: 1e-7, shipDensity: 1e-7, cellAreaM2: 1e8,
            vesselSpeedMs, whaleSpeedMs: 2,
            whaleLengthM: 20, shipBeamM: 30,
            durationSec: 86400,
        });
        expect(base(10)).toBeGreaterThan(base(5));
    });

    it('respects pAvoidance reducing mortality', () => {
        const opts = {
            whaleDensity: 1e-7, shipDensity: 1e-7, cellAreaM2: 1e8,
            vesselSpeedMs: 7, whaleSpeedMs: 2,
            whaleLengthM: 20, shipBeamM: 30,
            durationSec: 86400,
        };
        const m1 = expectedLethalStrikes({ ...opts, pAvoidance: 0 });
        const m2 = expectedLethalStrikes({ ...opts, pAvoidance: 0.5 });
        expect(m2).toBeLessThan(m1);
    });
});

describe('getStrikeRisk', () => {
    it('returns high for blue whale', () => {
        expect(getStrikeRisk('Balaenoptera musculus')).toBe('high');
    });
    it('returns high for fin whale', () => {
        expect(getStrikeRisk('Balaenoptera physalus')).toBe('high');
    });
    it('returns low for harbour porpoise', () => {
        expect(getStrikeRisk('Phocoena phocoena')).toBe('low');
    });
    it('returns low for unknown species', () => {
        expect(getStrikeRisk('Unknown')).toBe('low');
    });
    it('returns medium for minke whale', () => {
        expect(getStrikeRisk('Balaenoptera acutorostrata')).toBe('medium');
    });
});

describe('inSeason', () => {
    it('returns true when month is 0 (any)', () => {
        expect(inSeason('Balaenoptera musculus', 0)).toBe(true);
    });
    it('returns true for blue whale in July', () => {
        expect(inSeason('Balaenoptera musculus', 7)).toBe(true);
    });
    it('returns false for blue whale in February', () => {
        expect(inSeason('Balaenoptera musculus', 2)).toBe(false);
    });
    it('returns true if no seasonality data', () => {
        expect(inSeason('Unknown', 7)).toBe(true);
    });
});

describe('pointInRing', () => {
    const rect = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]];
    it('returns true for point inside', () => { expect(pointInRing(5, 5, rect)).toBe(true); });
    it('returns false for point outside', () => { expect(pointInRing(15, 5, rect)).toBe(false); });
});

describe('pointInFeature', () => {
    it('handles Polygon with hole', () => {
        const polygon = {
            type: 'Polygon',
            coordinates: [
                [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]],
                [[5, 5], [15, 5], [15, 15], [5, 15], [5, 5]],
            ],
        };
        expect(pointInFeature(10, 10, polygon)).toBe(false);
        expect(pointInFeature(2, 2, polygon)).toBe(true);
    });

    it('handles MultiPolygon', () => {
        const multi = {
            type: 'MultiPolygon',
            coordinates: [
                [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
                [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]],
            ],
        };
        expect(pointInFeature(2, 2, multi)).toBe(true);
        expect(pointInFeature(12, 12, multi)).toBe(true);
        expect(pointInFeature(7, 7, multi)).toBe(false);
    });

    it('returns false for unsupported geometry', () => {
        expect(pointInFeature(0, 0, { type: 'Point', coordinates: [0, 0] })).toBe(false);
    });
});

describe('distanceKm', () => {
    it('returns 0 for same point', () => {
        expect(distanceKm(60, 10, 60, 10)).toBe(0);
    });
    it('computes Tromso to Andoya (~200 km)', () => {
        // Tromso 69.65, 18.96 -> Andoya (Andenes) 69.32, 16.13
        const d = distanceKm(69.65, 18.96, 69.32, 16.13);
        expect(d).toBeGreaterThan(80);
        expect(d).toBeLessThan(140);
    });
});

describe('scorePort', () => {
    const mockPort = { lat: 70, lon: 19 };

    it('returns zero score when no observations nearby', () => {
        const far = [{ lat: 60, lon: 5, species: 'Phocoena phocoena' }];
        const result = scorePort(mockPort, far);
        expect(result.nearbyCount).toBe(0);
        expect(result.normScore).toBe(0);
    });

    it('counts nearby observations', () => {
        const nearby = [
            { lat: 70.01, lon: 19.01, species: 'Phocoena phocoena' },
            { lat: 70.02, lon: 19.02, species: 'Megaptera novaeangliae' },
        ];
        const result = scorePort(mockPort, nearby);
        expect(result.nearbyCount).toBe(2);
    });

    it('scores great whales higher than dolphins', () => {
        const blue = [{ lat: 70.01, lon: 19.01, species: 'Balaenoptera musculus' }]; // EN, high
        const dolphin = [{ lat: 70.01, lon: 19.01, species: 'Lagenorhynchus albirostris' }]; // LC, low
        expect(scorePort(mockPort, blue).normScore)
            .toBeGreaterThan(scorePort(mockPort, dolphin).normScore);
    });

    it('rises with vessel speed', () => {
        const obs = [{ lat: 70.01, lon: 19.01, species: 'Megaptera novaeangliae' }];
        const slow = scorePort(mockPort, obs, 8);
        const fast = scorePort(mockPort, obs, 18);
        expect(fast.normScore).toBeGreaterThan(slow.normScore);
    });

    it('clamps normScore at 1', () => {
        const obs = Array.from({ length: 200 }, (_, i) => ({
            lat: 70 + i * 0.001, lon: 19,
            species: 'Eubalaena glacialis', // CR + high
        }));
        const result = scorePort(mockPort, obs, 18);
        expect(result.normScore).toBe(1);
    });
});

describe('scoreRegion', () => {
    it('returns zero score for empty observations', () => {
        const r = {};
        const result = scoreRegion(r, [], 14);
        expect(result.normScore).toBe(0);
        expect(result.observationCount).toBe(0);
        expect(result.speciesCount).toBe(0);
    });

    it('scores per unique species, not per observation', () => {
        const r = {};
        const single = [{ species: 'Megaptera novaeangliae', _region: r }];
        const many = Array.from({ length: 50 }, () => ({ species: 'Megaptera novaeangliae', _region: r }));
        const a = scoreRegion(r, single, 14);
        const b = scoreRegion(r, many, 14);
        expect(a.normScore).toBe(b.normScore);
        expect(a.observationCount).toBe(1);
        expect(b.observationCount).toBe(50);
    });

    it('scales with vessel speed', () => {
        const r = {};
        const obs = [{ species: 'Balaenoptera musculus', _region: r }];
        const a = scoreRegion(r, obs, 8);
        const b = scoreRegion(r, obs, 18);
        expect(b.normScore).toBeGreaterThan(a.normScore);
    });

    it('does not inflate score for low-vulnerability species', () => {
        const r = {};
        const obs = [
            { species: 'Phocoena phocoena', _region: r },
            { species: 'Phocoena phocoena', _region: r },
        ];
        const result = scoreRegion(r, obs, 14);
        expect(result.normScore).toBe(0);
        expect(result.observationCount).toBe(2);
    });
});

describe('scoreToColor', () => {
    it('returns valid rgb string', () => {
        expect(scoreToColor(0.5)).toMatch(/^rgb\(\d+,\d+,80\)$/);
    });
    it('greener for low score, redder for high', () => {
        const low = scoreToColor(0.1);
        const high = scoreToColor(0.9);
        const [, lr, lg] = low.match(/rgb\((\d+),(\d+),/);
        const [, hr, hg] = high.match(/rgb\((\d+),(\d+),/);
        expect(Number(hr)).toBeGreaterThan(Number(lr));
        expect(Number(lg)).toBeGreaterThan(Number(hg));
    });
});

describe('riskLabel', () => {
    it('returns Low for score < 0.2', () => {
        expect(riskLabel(0.1).text).toBe('Low strike risk');
    });
    it('returns Moderate for 0.2-0.5', () => {
        expect(riskLabel(0.3).text).toBe('Moderate strike risk');
    });
    it('returns High for 0.5-0.75', () => {
        expect(riskLabel(0.6).text).toBe('High strike risk');
    });
    it('returns Very high for >= 0.75', () => {
        expect(riskLabel(0.9).text).toBe('Very high strike risk');
    });
});

describe('speciesColor', () => {
    it('returns valid hsl string', () => {
        expect(speciesColor('Balaenoptera musculus')).toMatch(/^hsl\(\d+, 70%, 60%\)$/);
    });
    it('is deterministic', () => {
        expect(speciesColor('Orcinus orca')).toBe(speciesColor('Orcinus orca'));
    });
    it('produces different colors for different species', () => {
        expect(speciesColor('Phocoena phocoena')).not.toBe(speciesColor('Orcinus orca'));
    });
});

describe('knotsToKmh', () => {
    it('converts 10 knots to 18.52 km/h', () => {
        expect(knotsToKmh(10)).toBeCloseTo(18.52, 2);
    });
});
