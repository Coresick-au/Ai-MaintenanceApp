import { test, expect } from '@playwright/test';

test.describe('Maintenance App E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForSelector('.sidebar-nav');
  });

  test('app loads successfully', async ({ page }) => {
    // Check that main elements are present
    await expect(page.locator('.sidebar-nav')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Maintenance Dashboard');
  });

  test('can create a new site', async ({ page }) => {
    // Click Add New Site button
    await page.click('[data-testid="add-new-site"]');
    
    // Wait for modal to open
    await expect(page.locator('[data-testid="add-site-modal"]')).toBeVisible();
    
    // Fill in site details
    await page.fill('[data-testid="site-name"]', 'Test Site');
    await page.fill('[data-testid="site-customer"]', 'Test Customer');
    await page.fill('[data-testid="site-location"]', 'Test Location');
    
    // Save the site
    await page.click('[data-testid="save-site"]');
    
    // Wait for modal to close
    await expect(page.locator('[data-testid="add-site-modal"]')).not.toBeVisible();
    
    // Verify site was created (check if it appears in the sidebar)
    await expect(page.locator('text=Test Site')).toBeVisible();
  });

  test('can add an asset to a site', async ({ page }) => {
    // First create a site if none exists
    const siteExists = await page.locator('text=Test Site').isVisible();
    if (!siteExists) {
      await page.click('[data-testid="add-new-site"]');
      await page.fill('[data-testid="site-name"]', 'Test Site');
      await page.fill('[data-testid="site-customer"]', 'Test Customer');
      await page.fill('[data-testid="site-location"]', 'Test Location');
      await page.click('[data-testid="save-site"]');
      await page.waitForSelector('text=Test Site');
    }
    
    // Click on the site
    await page.click('text=Test Site');
    
    // Click Add Asset button
    await page.click('[data-testid="add-asset"]');
    
    // Wait for modal to open
    await expect(page.locator('[data-testid="add-asset-modal"]')).toBeVisible();
    
    // Fill in asset details
    await page.fill('[data-testid="asset-name"]', 'Test Asset');
    await page.fill('[data-testid="asset-code"]', 'TEST001');
    await page.fill('[data-testid="asset-frequency"]', '90');
    await page.fill('[data-testid="asset-last-cal"]', '2024-01-01');
    
    // Save the asset
    await page.click('[data-testid="save-asset"]');
    
    // Wait for modal to close
    await expect(page.locator('[data-testid="add-asset-modal"]')).not.toBeVisible();
    
    // Verify asset was created
    await expect(page.locator('text=Test Asset')).toBeVisible();
    await expect(page.locator('text=TEST001')).toBeVisible();
  });

  test('can update operational status', async ({ page }) => {
    // First ensure we have a site with an asset
    await page.click('text=Test Site');
    
    // Wait for assets to load
    await page.waitForSelector('[data-testid="operational-status"]');
    
    // Click on operational status button
    await page.click('[data-testid="operational-status"]');
    
    // Wait for modal to open
    await expect(page.locator('[data-testid="op-status-modal"]')).toBeVisible();
    
    // Update status
    await page.selectOption('[data-testid="status-select"]', 'Warning');
    await page.fill('[data-testid="status-note"]', 'Test note for warning status');
    
    // Save the status
    await page.click('[data-testid="save-status"]');
    
    // Wait for modal to close
    await expect(page.locator('[data-testid="op-status-modal"]')).not.toBeVisible();
    
    // Verify status was updated
    await expect(page.locator('[data-testid="operational-status"]')).toContainText('Warning');
  });

  test('can generate PDF report', async ({ page }) => {
    // Navigate to a site
    await page.click('text=Test Site');
    
    // Click on Customer Report button
    await page.click('[data-testid="customer-report"]');
    
    // Wait for modal to open
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    
    // Click Print to PDF button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="print-pdf"]');
    
    // Wait for download to start
    const download = await downloadPromise;
    
    // Verify download filename
    expect(download.suggestedFilename()).toMatch(/maintenance-report.*\.pdf$/);
  });

  test('can backup and restore data', async ({ page }) => {
    // Click backup button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="backup-data"]');
    
    // Wait for download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/backup.*\.json$/);
    
    // Test restore (this would require file upload handling)
    // For now, just verify the restore button exists
    await expect(page.locator('[data-testid="restore-data"]')).toBeVisible();
  });

  test('fullscreen mode works correctly', async ({ page }) => {
    // Find a fullscreen container
    const fullscreenContainer = page.locator('[data-testid="fullscreen-container"]').first();
    
    if (await fullscreenContainer.isVisible()) {
      // Click fullscreen button
      await fullscreenContainer.locator('[data-testid="fullscreen-toggle"]').click();
      
      // Verify fullscreen mode is active
      await expect(page.locator('[data-testid="fullscreen-active"]')).toBeVisible();
      
      // Exit fullscreen
      await page.keyboard.press('Escape');
      
      // Verify fullscreen is exited
      await expect(page.locator('[data-testid="fullscreen-active"]')).not.toBeVisible();
    }
  });

  test('error handling works', async ({ page }) => {
    // Test with invalid data to trigger validation
    await page.click('[data-testid="add-new-site"]');
    await page.click('[data-testid="save-site"]'); // Try to save without required fields
    
    // Should show validation errors
    await expect(page.locator('text=Site name is required')).toBeVisible();
    await expect(page.locator('text=Customer name is required')).toBeVisible();
  });
});
