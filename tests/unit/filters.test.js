import { describe, it, expect } from 'vitest';
import { FILTER_PREDICATES } from '../../js/ui.js';

describe('FILTER_PREDICATES', () => {
    describe('threatened', () => {
        it('passes for blue whale (EN)', () => {
            expect(FILTER_PREDICATES['threatened']({ species: 'Balaenoptera musculus' })).toBe(true);
        });
        it('passes for narwhal (VU on Norwegian Red List)', () => {
            expect(FILTER_PREDICATES['threatened']({ species: 'Monodon monoceros' })).toBe(true);
        });
        it('passes for North Atlantic right whale (CR)', () => {
            expect(FILTER_PREDICATES['threatened']({ species: 'Eubalaena glacialis' })).toBe(true);
        });
        it('fails for harbour porpoise (LC)', () => {
            expect(FILTER_PREDICATES['threatened']({ species: 'Phocoena phocoena' })).toBe(false);
        });
        it('fails for unlisted species', () => {
            expect(FILTER_PREDICATES['threatened']({ species: 'Unknown' })).toBe(false);
        });
    });

    describe('red-list', () => {
        it('passes for fin whale (VU globally)', () => {
            expect(FILTER_PREDICATES['red-list']({ species: 'Balaenoptera physalus' })).toBe(true);
        });
        it('passes for sperm whale (VU globally)', () => {
            expect(FILTER_PREDICATES['red-list']({ species: 'Physeter macrocephalus' })).toBe(true);
        });
        it('passes for northern bottlenose whale (NT globally)', () => {
            expect(FILTER_PREDICATES['red-list']({ species: 'Hyperoodon ampullatus' })).toBe(true);
        });
        it('fails for harbour porpoise (LC)', () => {
            expect(FILTER_PREDICATES['red-list']({ species: 'Phocoena phocoena' })).toBe(false);
        });
    });

    describe('strike-risk', () => {
        it('passes for high-risk fin whale', () => {
            expect(FILTER_PREDICATES['strike-risk']({ species: 'Balaenoptera physalus' })).toBe(true);
        });
        it('passes for medium-risk minke whale', () => {
            expect(FILTER_PREDICATES['strike-risk']({ species: 'Balaenoptera acutorostrata' })).toBe(true);
        });
        it('fails for low-risk porpoise', () => {
            expect(FILTER_PREDICATES['strike-risk']({ species: 'Phocoena phocoena' })).toBe(false);
        });
    });

    describe('great-whales', () => {
        it('passes for blue whale', () => {
            expect(FILTER_PREDICATES['great-whales']({ species: 'Balaenoptera musculus' })).toBe(true);
        });
        it('passes for sperm whale', () => {
            expect(FILTER_PREDICATES['great-whales']({ species: 'Physeter macrocephalus' })).toBe(true);
        });
        it('fails for harbour porpoise', () => {
            expect(FILTER_PREDICATES['great-whales']({ species: 'Phocoena phocoena' })).toBe(false);
        });
        it('fails for orca', () => {
            expect(FILTER_PREDICATES['great-whales']({ species: 'Orcinus orca' })).toBe(false);
        });
    });
});
