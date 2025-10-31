const { test, expect } = require('@playwright/test');

test.describe('Showcase', () => {
	test('should load the showcase home page', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveTitle(/svelte-oidc demo/);
	});
});
