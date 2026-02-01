/**
 * Visitor Registration E2E Tests
 * CRITICAL: This is the primary flow for hospital visitors
 *
 * Tests the public registration page where visitors register their vehicles
 * to get temporary parking passes.
 */

import { test, expect } from '@playwright/test';

test.describe('Visitor Registration Flow', () => {
  // Building slug from seed data
  const buildingSlug = 'alina-visitor-parking';
  const registrationUrl = `/register/${buildingSlug}`;

  test.beforeEach(async ({ page }) => {
    // Navigate to registration page before each test
    await page.goto(registrationUrl);
  });

  test('should display registration form', async ({ page }) => {
    // Verify page loaded correctly
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Verify form elements are present
    await expect(page.getByLabel(/license plate/i)).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByRole('combobox', { name: /unit/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Click register without filling form
    await page.getByRole('button', { name: /register/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required/i)).toBeVisible();
  });

  test('should validate license plate format', async ({ page }) => {
    // Enter invalid license plate (too short)
    await page.getByLabel(/license plate/i).fill('A');

    // Try to submit
    await page.getByRole('button', { name: /register/i }).click();

    // Should show license plate validation error
    await expect(page.getByText(/at least 2 characters/i)).toBeVisible();
  });

  test('should auto-uppercase license plate input', async ({ page }) => {
    const licensePlateInput = page.getByLabel(/license plate/i);

    // Type lowercase
    await licensePlateInput.fill('abc123');

    // Value should be uppercased
    await expect(licensePlateInput).toHaveValue(/ABC123/i);
  });

  test('should complete registration with valid data', async ({ page }) => {
    // Fill in required fields
    await page.getByLabel(/license plate/i).fill('TEST123');
    await page.getByLabel(/name/i).fill('Test Visitor');

    // Select unit from dropdown
    const unitSelect = page.getByRole('combobox', { name: /unit/i });
    await unitSelect.click();
    await page.getByRole('option').first().click();

    // Select duration
    const durationSelect = page.getByRole('combobox', { name: /duration/i });
    if (await durationSelect.isVisible()) {
      await durationSelect.click();
      await page.getByRole('option', { name: /4 hours/i }).click();
    }

    // Submit form
    await page.getByRole('button', { name: /register/i }).click();

    // Wait for confirmation - should show confirmation code
    await expect(page.getByText(/confirmation/i)).toBeVisible({ timeout: 10000 });

    // Should display a confirmation code (8 characters)
    await expect(page.getByText(/[A-Z0-9]{8}/)).toBeVisible();
  });

  test('should show pass details after registration', async ({ page }) => {
    // Complete registration
    await page.getByLabel(/license plate/i).fill('PASS123');
    await page.getByLabel(/name/i).fill('Pass Test');

    const unitSelect = page.getByRole('combobox', { name: /unit/i });
    await unitSelect.click();
    await page.getByRole('option').first().click();

    await page.getByRole('button', { name: /register/i }).click();

    // Wait for confirmation
    await expect(page.getByText(/confirmation/i)).toBeVisible({ timeout: 10000 });

    // Should show pass details
    await expect(page.getByText(/PASS123/i)).toBeVisible(); // License plate
    await expect(page.getByText(/Pass Test/i)).toBeVisible(); // Visitor name
    await expect(page.getByText(/expires/i)).toBeVisible(); // Expiration info
  });

  test('should allow registering another vehicle', async ({ page }) => {
    // Complete first registration
    await page.getByLabel(/license plate/i).fill('FIRST01');
    await page.getByLabel(/name/i).fill('First Visitor');

    const unitSelect = page.getByRole('combobox', { name: /unit/i });
    await unitSelect.click();
    await page.getByRole('option').first().click();

    await page.getByRole('button', { name: /register/i }).click();

    // Wait for confirmation
    await expect(page.getByText(/confirmation/i)).toBeVisible({ timeout: 10000 });

    // Click "Register Another" button
    const registerAnotherButton = page.getByRole('button', { name: /register another/i });
    if (await registerAnotherButton.isVisible()) {
      await registerAnotherButton.click();

      // Should return to registration form
      await expect(page.getByLabel(/license plate/i)).toBeVisible();
      await expect(page.getByLabel(/license plate/i)).toHaveValue('');
    }
  });

  test('should be mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Verify form is usable on mobile
    await expect(page.getByLabel(/license plate/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /register/i })).toBeVisible();

    // Form should be touch-friendly
    const button = page.getByRole('button', { name: /register/i });
    const boundingBox = await button.boundingBox();
    expect(boundingBox?.height).toBeGreaterThanOrEqual(44); // iOS minimum touch target
  });
});

test.describe('Invalid Building Handling', () => {
  test('should show error for non-existent building', async ({ page }) => {
    await page.goto('/register/non-existent-building');

    // Should show error or 404
    await expect(
      page.getByText(/not found|building.*not found|error/i)
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Registration Error Handling', () => {
  test('should handle network errors gracefully', async ({ page }) => {
    await page.goto(`/register/alina-visitor-parking`);

    // Fill form
    await page.getByLabel(/license plate/i).fill('NET123');
    await page.getByLabel(/name/i).fill('Network Test');

    const unitSelect = page.getByRole('combobox', { name: /unit/i });
    await unitSelect.click();
    await page.getByRole('option').first().click();

    // Simulate offline
    await page.route('**/api/passes', (route) => route.abort('failed'));

    // Submit
    await page.getByRole('button', { name: /register/i }).click();

    // Should show error message (not crash)
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });
});
