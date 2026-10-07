import {test, expect} from '@playwright/test';
async function ready(page) {
    await page.goto('/');
    await page.getByRole('button', {name:'Dismiss introduction'}).click();
    await expect(page.locator('#loading')).toBeHidden();
}
test('intro fills viewport, replays and restores focus', async ({page}) => {
    await ready(page);
    const replay=page.getByRole('button',{name:'Replay ocean introduction'});
    await replay.click();
    const box=await page.locator('.ocean-intro__card').boundingBox();
    expect(box.width).toBe(page.viewportSize().width);
    expect(box.height).toBe(page.viewportSize().height);
    await expect(page.locator('#panel')).toHaveAttribute('inert','');
    await page.keyboard.press('Escape');
    await expect(replay).toBeFocused();
});
test('port speed model changes and honours empty species filter', async ({page}) => {
    await ready(page);
    await page.getByRole('button',{name:'Tromso',exact:true}).click();
    const model=page.locator('#port-diagram .ocean-marker-current');
    await expect(model).toHaveAttribute('data-speed','14');
    await page.locator('#port-speed').fill('10');
    await expect(model).toHaveAttribute('data-speed','10');
    await page.getByRole('button',{name:'Close port',exact:true}).click();
    await page.selectOption('#species-filter','Ziphius cavirostris');
    await page.getByRole('button',{name:'Tromso',exact:true}).click();
    await expect(page.locator('#port-stats')).toContainText('0 cetacean');
    await expect(page.locator('#port-risk')).toContainText('unknown');
});
test('photo card shows records and filters the map', async ({page}) => {
    await ready(page);
    await page.locator('#species-list [data-whale-details="Megaptera novaeangliae"]').click();
    await expect(page.locator('#whale-name')).toHaveText('Humpback whale');
    await expect(page.locator('.month-bars > div')).toHaveCount(12);
    await expect.poll(() => page.locator('#whale-card img').evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
    await page.getByRole('button',{name:'Show on map',exact:true}).click();
    await expect(page.locator('#species-filter')).toHaveValue('Megaptera novaeangliae');
    await expect(page.locator('#stat-species')).toHaveText('1');
});
test('saved snapshot reloads without the network', async ({page,context}) => {
    await ready(page);
    await expect(page.locator('#snapshot-status')).toContainText('Local snapshot ready');
    await page.evaluate(async()=>{ await navigator.serviceWorker.ready; });
    await context.setOffline(true);
    await ready(page);
    await expect(page.locator('#stat-obs')).toHaveText('9,996');
    await expect(page.locator('#snapshot-status')).toContainText('Offline');
    await page.getByRole('button',{name:'Tromso',exact:true}).click();
    await expect(page.locator('#port-diagram svg')).toHaveCount(2);
});
test('mobile diagrams fit without horizontal clipping', async ({page}) => {
    await page.setViewportSize({width:390,height:844});
    await page.emulateMedia({reducedMotion:'reduce'});
    await ready(page);
    await page.getByRole('button',{name:'Filters & whales'}).click();
    await page.getByRole('button',{name:'Tromso',exact:true}).click();
    const bounds=await page.locator('#port-modal .modal').evaluate(el=>({width:el.clientWidth,scroll:el.scrollWidth}));
    expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);
    await expect(page.locator('#port-diagram .ocean-diagram__curve')).toBeVisible();
});
test('city labels sit above the heatmap and no scripts depend on CDNs', async ({page}) => {
    await ready(page);
    await expect(page.locator('.city-label').first()).toBeVisible();
    expect(await page.locator('script[src^="http"]').count()).toBe(0);
});
test('external map failure leaves records usable and shows a notice', async ({page}) => {
    await page.route('https://tile.openstreetmap.org/**', route=>route.abort());
    await ready(page);
    await expect(page.locator('#map-status')).toContainText('Basemap unavailable');
    await expect(page.locator('#map-status')).toBeVisible();
    await expect(page.locator('#stat-obs')).toHaveText('9,996');
});
test('failed data response shows retry and help still works', async ({page}) => {
    await page.route('**/data/whales_norway.json',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.goto('/');
    await page.getByRole('button',{name:'Dismiss introduction'}).click();
    await expect(page.getByRole('button',{name:'Try again'})).toBeVisible();
    await page.locator('.info-btn').click();
    await expect(page.locator('#info-modal')).toHaveClass(/open/);
});
test('runtime has no uncaught errors', async ({page}) => {
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await ready(page);
    await page.locator('.info-btn').click();
    await page.keyboard.press('Escape');
    await page.locator('#theme-btn').click();
    expect(errors).toEqual([]);
});
