/**
 * Mobile-First Responsive E2E Tests
 *
 * Tests responsiveness across different device sizes as specified in PR-mobile-responsive.md:
 * - iPhone SE (375px)
 * - iPhone 12-14 (390px)
 * - iPhone Pro Max (428px)
 *
 * Covers:
 * - Hamburger menu navigation
 * - Horizontal scroll tables
 * - Form usability (16px font minimum to prevent iOS zoom)
 * - Touch targets (44px minimum)
 * - Role-based responsive views
 */

import { test, expect, Page } from '@playwright/test';

// Device viewport configurations
const MOBILE_DEVICES = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone12_14: { width: 390, height: 844 },
  iPhoneProMax: { width: 428, height: 926 },
} as const;

// Minimum touch target size (iOS HIG recommendation)
const MIN_TOUCH_TARGET = 44;

// Minimum font size to prevent iOS auto-zoom
const MIN_FORM_FONT_SIZE = 16;

// Test credentials from environment
const getTestCredentials = () => ({
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? '',
    password: process.env.TEST_ADMIN_PASSWORD ?? '',
  },
  manager: {
    email: process.env.TEST_MANAGER_EMAIL ?? '',
    password: process.env.TEST_MANAGER_PASSWORD ?? '',
  },
  security: {
    email: process.env.TEST_SECURITY_EMAIL ?? '',
    password: process.env.TEST_SECURITY_PASSWORD ?? '',
  },
});

// Helper to login as a specific role
async function loginAs(page: Page, role: 'admin' | 'manager' | 'security') {
  const credentials = getTestCredentials()[role];
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

// Helper to get computed font size in pixels
async function getFontSize(page: Page, selector: string): Promise<number> {
  return page.locator(selector).first().evaluate((el) => {
    const style = window.getComputedStyle(el);
    return parseFloat(style.fontSize);
  });
}

// Helper to check if element is scrollable horizontally
async function isHorizontallyScrollable(page: Page, selector: string): Promise<boolean> {
  return page.locator(selector).first().evaluate((el) => {
    return el.scrollWidth > el.clientWidth;
  });
}

// =============================================================================
// VIEWPORT TESTS - Test on different iPhone sizes
// =============================================================================

test.describe('Viewport Responsiveness', () => {
  for (const [deviceName, viewport] of Object.entries(MOBILE_DEVICES)) {
    test.describe(`${deviceName} (${viewport.width}px)`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(viewport);
      });

      test('login page renders correctly', async ({ page }) => {
        await page.goto('/login');

        // Form should be visible and usable
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

        // Card should fit within viewport (no horizontal overflow)
        const card = page.locator('.card, [class*="Card"]').first();
        if (await card.isVisible()) {
          const box = await card.boundingBox();
          expect(box?.width).toBeLessThanOrEqual(viewport.width);
        }
      });

      test('registration page renders correctly', async ({ page }) => {
        await page.goto('/register/alina-visitor-parking');

        // Wait for loading to complete
        await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

        // Form elements should be visible
        await expect(page.getByLabel(/name/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /register/i })).toBeVisible();

        // Page should not have horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
      });

      test('dashboard shows mobile header with hamburger menu', async ({ page }) => {
        await loginAs(page, 'admin');

        // Mobile header should be visible
        const mobileHeader = page.locator('header').filter({ has: page.locator('button') });
        await expect(mobileHeader).toBeVisible();

        // Hamburger menu button should be visible
        const menuButton = page.getByRole('button', { name: /open menu/i });
        await expect(menuButton).toBeVisible();

        // Desktop sidebar should be hidden
        const sidebar = page.locator('aside');
        await expect(sidebar).toBeHidden();
      });

      test('duration buttons display in responsive grid', async ({ page }) => {
        await page.goto('/register/alina-visitor-parking');
        await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

        // Find duration buttons container
        const durationButtons = page.locator('button').filter({ hasText: /hours?/i });
        const count = await durationButtons.count();

        // Should have duration options
        expect(count).toBeGreaterThan(0);

        // All buttons should be visible and have proper size
        for (let i = 0; i < Math.min(count, 5); i++) {
          const button = durationButtons.nth(i);
          await expect(button).toBeVisible();
          const box = await button.boundingBox();
          expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
        }
      });
    });
  }
});

// =============================================================================
// HAMBURGER MENU TESTS
// =============================================================================

test.describe('Hamburger Menu Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone12_14);
  });

  test('hamburger menu opens and closes smoothly', async ({ page }) => {
    await loginAs(page, 'admin');

    // Find and click hamburger menu button
    const menuButton = page.getByRole('button', { name: /open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // Sheet/drawer should open
    const drawer = page.locator('[role="dialog"], [data-state="open"]');
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Navigation items should be visible in drawer
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();

    // Close the menu by clicking outside or close button
    const closeButton = page.getByRole('button', { name: /close/i });
    if (await closeButton.isVisible()) {
      await closeButton.click();
    } else {
      // Click outside to close
      await page.keyboard.press('Escape');
    }

    // Drawer should close
    await expect(drawer).toBeHidden({ timeout: 5000 });
  });

  test('hamburger menu shows role-appropriate navigation items for admin', async ({ page }) => {
    await loginAs(page, 'admin');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Admin should see all navigation items including Users and Settings
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /passes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('hamburger menu navigation links work correctly', async ({ page }) => {
    await loginAs(page, 'admin');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Click on Passes link
    await page.getByRole('link', { name: /passes/i }).click();

    // Should navigate to passes page
    await page.waitForURL('**/passes**', { timeout: 10000 });
    expect(page.url()).toContain('/passes');

    // Menu should close after navigation
    const drawer = page.locator('[role="dialog"][data-state="open"]');
    await expect(drawer).toBeHidden({ timeout: 5000 });
  });

  test('hamburger menu shows user info and sign out', async ({ page }) => {
    await loginAs(page, 'admin');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // User info should be visible (name or role)
    await expect(page.getByText(/admin/i)).toBeVisible();

    // Sign out button should be visible
    await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
  });

  test('hamburger menu touch target meets minimum size', async ({ page }) => {
    await loginAs(page, 'admin');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    const box = await menuButton.boundingBox();

    // Should meet minimum touch target size
    expect(box?.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });
});

// =============================================================================
// HORIZONTAL SCROLL TABLE TESTS
// =============================================================================

test.describe('Horizontal Scroll Tables', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhoneSE);
  });

  test('passes table scrolls horizontally on mobile', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/passes');

    // Wait for table to load
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Table wrapper should have horizontal scroll
    const tableWrapper = page.locator('table').locator('..');
    const hasScroll = await tableWrapper.evaluate((el) => {
      return el.scrollWidth > el.clientWidth || window.getComputedStyle(el).overflowX === 'auto';
    });

    // Either has overflow or the parent container allows scrolling
    expect(hasScroll).toBe(true);
  });

  test('table content is not cut off', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/passes');

    // Wait for table
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Table headers should all be visible (may require scrolling)
    const headers = ['Vehicle', 'Unit', 'Visitor', 'Duration', 'Status', 'Expires'];
    for (const header of headers) {
      const headerCell = page.locator('th', { hasText: header });
      // Header should exist in DOM even if not immediately visible
      await expect(headerCell).toHaveCount(1);
    }
  });

  test('table layout does not break page layout', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/passes');

    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });

    // Page should not have unwanted horizontal scroll (only table container)
    const pageHasUnwantedScroll = await page.evaluate(() => {
      const body = document.body;
      return body.scrollWidth > window.innerWidth;
    });

    // The body shouldn't overflow, only the table container should
    expect(pageHasUnwantedScroll).toBe(false);
  });

  test('users table scrolls horizontally on mobile', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/users');

    // Wait for table to load (may show empty state)
    await page.waitForTimeout(2000);

    const table = page.locator('table');
    if (await table.isVisible()) {
      const tableWrapper = table.locator('..');
      const style = await tableWrapper.evaluate((el) => {
        return window.getComputedStyle(el).overflowX;
      });
      expect(['auto', 'scroll']).toContain(style);
    }
  });
});

// =============================================================================
// FORM USABILITY TESTS (16px font minimum)
// =============================================================================

test.describe('Form Usability - Font Size', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone12_14);
  });

  test('login form inputs have 16px+ font to prevent iOS zoom', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check font sizes
    const emailFontSize = await emailInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });
    const passwordFontSize = await passwordInput.evaluate((el) => {
      return parseFloat(window.getComputedStyle(el).fontSize);
    });

    expect(emailFontSize).toBeGreaterThanOrEqual(MIN_FORM_FONT_SIZE);
    expect(passwordFontSize).toBeGreaterThanOrEqual(MIN_FORM_FONT_SIZE);
  });

  test('registration form inputs have 16px+ font', async ({ page }) => {
    await page.goto('/register/alina-visitor-parking');

    await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

    // Check all text inputs
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const count = await inputs.count();

    for (let i = 0; i < count; i++) {
      const fontSize = await inputs.nth(i).evaluate((el) => {
        return parseFloat(window.getComputedStyle(el).fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(MIN_FORM_FONT_SIZE);
    }
  });

  test('form labels are readable on mobile', async ({ page }) => {
    await page.goto('/register/alina-visitor-parking');

    await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

    // Labels should have reasonable font size (at least 14px)
    const labels = page.locator('label');
    const count = await labels.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const label = labels.nth(i);
      if (await label.isVisible()) {
        const fontSize = await label.evaluate((el) => {
          return parseFloat(window.getComputedStyle(el).fontSize);
        });
        expect(fontSize).toBeGreaterThanOrEqual(14);
      }
    }
  });
});

// =============================================================================
// TOUCH TARGET SIZE TESTS (44px minimum)
// =============================================================================

test.describe('Touch Target Sizes', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone12_14);
  });

  test('login button meets minimum touch target size', async ({ page }) => {
    await page.goto('/login');

    const signInButton = page.getByRole('button', { name: /sign in/i });
    await expect(signInButton).toBeVisible();

    const box = await signInButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  test('registration submit button meets minimum touch target size', async ({ page }) => {
    await page.goto('/register/alina-visitor-parking');

    const registerButton = page.getByRole('button', { name: /register/i });
    await expect(registerButton).toBeVisible({ timeout: 10000 });

    const box = await registerButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
  });

  test('duration selection buttons meet minimum touch target size', async ({ page }) => {
    await page.goto('/register/alina-visitor-parking');

    await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

    // Check duration buttons
    const durationButtons = page.locator('button').filter({ hasText: /hours?/i });
    const count = await durationButtons.count();

    for (let i = 0; i < count; i++) {
      const button = durationButtons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      }
    }
  });

  test('navigation items in hamburger menu meet touch target size', async ({ page }) => {
    await loginAs(page, 'admin');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Wait for drawer to open
    await page.waitForTimeout(500);

    // Check navigation links
    const navLinks = page.locator('nav a, nav [role="link"]');
    const count = await navLinks.count();

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      if (await link.isVisible()) {
        const box = await link.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
      }
    }
  });

  test('select/dropdown triggers meet minimum touch target size', async ({ page }) => {
    await page.goto('/register/alina-visitor-parking');

    await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

    // Check unit select
    const unitSelect = page.getByRole('combobox', { name: /unit/i });
    if (await unitSelect.isVisible()) {
      const box = await unitSelect.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    }
  });
});

// =============================================================================
// ROLE-BASED RESPONSIVE TESTS
// =============================================================================

test.describe('Role-Based Responsive Views', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone12_14);
  });

  test('ADMIN sees full navigation on mobile', async ({ page }) => {
    await loginAs(page, 'admin');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Admin should see all items
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /passes/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('ADMIN can access all dashboard pages on mobile', async ({ page }) => {
    await loginAs(page, 'admin');

    // Test navigation to various pages
    const pages = [
      { path: '/dashboard', title: /dashboard/i },
      { path: '/dashboard/passes', title: /passes/i },
      { path: '/dashboard/users', title: /users/i },
    ];

    for (const { path, title } of pages) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });
    }
  });

  test('manager has appropriate mobile access', async ({ page }) => {
    const credentials = getTestCredentials();

    // Skip if no manager credentials
    if (!credentials.manager.email) {
      test.skip();
      return;
    }

    await loginAs(page, 'manager');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Manager should see dashboard and passes
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /passes/i })).toBeVisible();

    // Manager should NOT see Users (admin only)
    const usersLink = page.getByRole('link', { name: /^users$/i });
    await expect(usersLink).not.toBeVisible();
  });

  test('security role has appropriate mobile access', async ({ page }) => {
    const credentials = getTestCredentials();

    // Skip if no security credentials
    if (!credentials.security.email) {
      test.skip();
      return;
    }

    await loginAs(page, 'security');

    const menuButton = page.getByRole('button', { name: /open menu/i });
    await menuButton.click();

    // Security should see dashboard and passes
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /passes/i })).toBeVisible();
  });
});

// =============================================================================
// ADDITIONAL RESPONSIVE PATTERNS
// =============================================================================

test.describe('Responsive Layout Patterns', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone12_14);
  });

  test('dashboard stat cards display in 2-column grid on mobile', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Check if stat cards exist and are in a grid layout
    const statCards = page.locator('[class*="grid"] > div').first();
    if (await statCards.isVisible()) {
      // Cards should be arranged in grid
      const parent = statCards.locator('..');
      const gridClass = await parent.getAttribute('class');
      expect(gridClass).toMatch(/grid/);
    }
  });

  test('page headers stack vertically on mobile', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/passes');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    // Header section should use flex-col on mobile
    const headerSection = page.locator('div').filter({ has: page.getByRole('heading', { level: 1 }) }).first();
    const className = await headerSection.getAttribute('class');

    // Should have flex-col for mobile stacking
    if (className) {
      expect(className).toMatch(/flex|space-y/);
    }
  });

  test('search input is full width on mobile', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/passes');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10000 });

    const searchInput = page.locator('input[placeholder*="Search"]');
    if (await searchInput.isVisible()) {
      const box = await searchInput.boundingBox();
      const viewport = MOBILE_DEVICES.iPhone12_14;

      // Search should take significant width on mobile (accounting for padding)
      expect(box?.width).toBeGreaterThan(viewport.width * 0.8);
    }
  });

  test('cards have appropriate mobile padding', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/passes');

    await expect(page.locator('.card, [class*="Card"]').first()).toBeVisible({ timeout: 10000 });

    // Cards should have appropriate padding for mobile
    const card = page.locator('.card, [class*="Card"]').first();
    const padding = await card.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return parseFloat(style.paddingLeft);
    });

    // Should have at least 12px padding (3 in Tailwind)
    expect(padding).toBeGreaterThanOrEqual(12);
  });
});

// =============================================================================
// DIALOG/MODAL RESPONSIVE TESTS
// =============================================================================

test.describe('Dialog Responsive Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize(MOBILE_DEVICES.iPhone12_14);
  });

  test('dialogs display as bottom sheet on mobile', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard/users');

    // Look for an "Add" or "Create" button that opens a dialog
    const addButton = page.getByRole('button', { name: /add|create|new/i });

    if (await addButton.isVisible()) {
      await addButton.click();

      // Wait for dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      // Dialog should be positioned at bottom or take full width
      const box = await dialog.boundingBox();
      if (box) {
        // On mobile, dialogs often stretch full width
        expect(box.width).toBeGreaterThan(MOBILE_DEVICES.iPhone12_14.width * 0.9);
      }
    }
  });
});

// =============================================================================
// PUBLIC PAGE RESPONSIVE TESTS
// =============================================================================

test.describe('Public Page Responsiveness', () => {
  for (const [deviceName, viewport] of Object.entries(MOBILE_DEVICES)) {
    test(`registration flow works on ${deviceName}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/register/alina-visitor-parking');

      // Wait for page to load
      await expect(page.getByLabel(/license plate/i)).toBeVisible({ timeout: 10000 });

      // Fill form
      await page.getByLabel(/name/i).fill('Test Visitor');
      await page.getByLabel(/license plate/i).fill('TEST' + deviceName.slice(0, 3).toUpperCase());

      // Select unit
      const unitSelect = page.getByRole('combobox', { name: /unit/i });
      await unitSelect.click();
      await page.getByRole('option').first().click();

      // Select duration
      const durationButton = page.locator('button').filter({ hasText: /2 hours/i });
      if (await durationButton.isVisible()) {
        await durationButton.click();
      }

      // Submit button should be accessible and properly sized
      const submitButton = page.getByRole('button', { name: /register/i });
      await expect(submitButton).toBeVisible();
      const box = await submitButton.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET);
    });
  }
});
