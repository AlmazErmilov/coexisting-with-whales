import { COMMON_NAMES, MONTH_NAMES, escapeHtml } from './data.js';
import { whaleThumbnail } from './whale-images.js';
import { getWhaleInfo } from './whale-info.js';
import { openDialog, closeDialog } from './dialogs.js';
import { applyFilters } from './ui.js';

export function summarizeWhale(name, records, filtered = records) {
    const own = records.filter(d => d.species === name);
    const months = Array.from({length: 12}, (_, i) => own.filter(d => d.month === i + 1).length);
    const years = own.map(d => d.year).filter(Number.isFinite);
    return { total: own.length, visible: filtered.filter(d => d.species === name).length, months,
        firstYear: years.length ? Math.min(...years) : null, lastYear: years.length ? Math.max(...years) : null };
}
export function initWhaleCards(all, filtered) {
    document.addEventListener('click', e => {
        const trigger = e.target.closest('[data-whale-details]');
        if (!trigger) return;
        const name = trigger.dataset.whaleDetails;
        const stats = summarizeWhale(name, all(), filtered());
        const info = getWhaleInfo(name);
        const peak = Math.max(1, ...stats.months);
        document.getElementById('whale-card').innerHTML = `${whaleThumbnail(name)}
            <h2 id="whale-name">${escapeHtml(COMMON_NAMES[name]?.en || name)}</h2><p><i>${escapeHtml(name)}</i></p>
            <div class="whale-metrics"><div><strong>${stats.total.toLocaleString()}</strong><small>sample records</small></div><div><strong>${stats.visible.toLocaleString()}</strong><small>current filters</small></div><div><strong>${stats.firstYear ?? '—'}–${stats.lastYear ?? '—'}</strong><small>record years</small></div></div>
            ${info?.fact ? `<p class="whale-fact">${escapeHtml(info.fact)} <a href="${escapeHtml(info.source)}" target="_blank" rel="noopener">NOAA ↗</a></p>` : ''}
            <figure class="month-chart"><figcaption>Records by month</figcaption><div class="month-bars">${stats.months.map((count, i) => `<div title="${MONTH_NAMES[i+1]}: ${count} records"><span style="height:${Math.max(2,count/peak*80)}px"></span><small>${MONTH_NAMES[i+1].slice(0,1)}</small></div>`).join('')}</div><p>Sampled records, not seasonal abundance.</p></figure>
            <button type="button" id="filter-whale">Show on map</button><a class="photo-credit" href="docs/whale-images.html">Photo credits</a>`;
        document.getElementById('filter-whale').onclick = () => {
            document.getElementById('species-filter').value = name;
            applyFilters();
            closeDialog(document.getElementById('whale-modal'));
            document.querySelectorAll('.modal-overlay.open').forEach(closeDialog);
        };
        openDialog('whale-modal');
    });
}
