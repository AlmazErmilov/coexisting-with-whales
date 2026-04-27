import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loading')).toBeHidden({ timeout: 30000 });
});

test('page loads with title', async ({ page }) => {
    await expect(page).toHaveTitle(/Coexisting with Whales/);
});

test('side panel renders stats', async ({ page }) => {
    const obs = page.locator('#stat-obs');
    const species = page.locator('#stat-species');
    await expect(obs).not.toHaveText('-');
    await expect(species).not.toHaveText('-');
    const obsText = await obs.textContent();
    expect(parseInt(obsText.replace(/,/g, ''))).toBeGreaterThan(1000);
});

test('species filter changes the count', async ({ page }) => {
    const allCount = parseInt((await page.locator('#stat-obs').textContent()).replace(/,/g, ''));
    await page.selectOption('#species-filter', 'great-whales');
    await page.waitForTimeout(200);
    const greatCount = parseInt((await page.locator('#stat-obs').textContent()).replace(/,/g, ''));
    expect(greatCount).toBeLessThan(allCount);
    expect(greatCount).toBeGreaterThan(0);
});

test('month slider changes the count', async ({ page }) => {
    const allCount = parseInt((await page.locator('#stat-obs').textContent()).replace(/,/g, ''));
    await page.locator('#month-slider').fill('7');
    await page.waitForTimeout(200);
    const julyCount = parseInt((await page.locator('#stat-obs').textContent()).replace(/,/g, ''));
    expect(julyCount).toBeLessThan(allCount);
});

test('view toggle switches between heatmap and points', async ({ page }) => {
    await page.click('button[data-view="points"]');
    await expect(page.locator('button[data-view="points"]')).toHaveClass(/active/);
    await page.click('button[data-view="heatmap"]');
    await expect(page.locator('button[data-view="heatmap"]')).toHaveClass(/active/);
});

test('info modal opens and closes', async ({ page }) => {
    await page.click('.info-btn');
    await expect(page.locator('#info-modal')).toHaveClass(/open/);
    await expect(page.locator('#info-modal h2')).toContainText('Coexisting with Whales');
    await page.locator('#info-modal .modal-close').click();
    await expect(page.locator('#info-modal')).not.toHaveClass(/open/);
});

test('info modal contains literature references', async ({ page }) => {
    await page.click('.info-btn');
    await expect(page.locator('#info-modal')).toHaveClass(/open/);
    // Wait for refs.js to inject reference tags
    await page.waitForTimeout(500);
    const vtRef = page.locator('#ref-vt-formula .ref-tag');
    await expect(vtRef).toBeVisible();
    const href = await vtRef.getAttribute('href');
    expect(href).toContain('doi.org');
});

test('Hide UI button toggles panels', async ({ page }) => {
    const panel = page.locator('#panel');
    await expect(panel).toBeVisible();
    await page.click('#hide-ui-btn');
    await expect(panel).toBeHidden();
    await page.click('#hide-ui-btn');
    await expect(panel).toBeVisible();
});

test('theme toggle switches the document theme', async ({ page }) => {
    const html = page.locator('html');
    const initial = await html.getAttribute('data-theme');
    await page.click('#theme-btn');
    await expect(html).toHaveAttribute('data-theme', initial === 'light' ? 'dark' : 'light');
    await page.click('#theme-btn');
    await expect(html).toHaveAttribute('data-theme', initial || 'dark');
});

test('keyboard H toggles UI', async ({ page }) => {
    await page.keyboard.press('h');
    await expect(page.locator('#panel')).toBeHidden();
    await page.keyboard.press('h');
    await expect(page.locator('#panel')).toBeVisible();
});

test('Escape closes any open modal', async ({ page }) => {
    await page.click('.info-btn');
    await expect(page.locator('#info-modal')).toHaveClass(/open/);
    await page.keyboard.press('Escape');
    await expect(page.locator('#info-modal')).not.toHaveClass(/open/);
});
