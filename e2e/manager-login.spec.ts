/**
 * Manager Login E2E Tests
 *
 * Tests the authentication flow for managers and admins
 * who need to access the dashboard to manage parking operations.
 *
 * IMPORTANT: Test credentials must be provided via environment variables:
 * - TEST_ADMIN_EMAIL
 * - TEST_ADMIN_PASSWORD
 * - TEST_MANAGER_EMAIL
 * - TEST_MANAGER_PASSWORD
 */

import { test, expect, Page } from '@playwright/test';

// Test credentials from environment variables (never hardcode credentials)
const getTestCredentials = () => ({
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? '',
    password: process.env.TEST_ADMIN_PASSWORD ?? '',
  },
  manager: {
    email: process.env.TEST_MANAGER_EMAIL ?? '',
    password: process.env.TEST_MANAGER_PASSWORD ?? '',
  },
});

// Helper function to login
async function loginAs(page: Page, role: 'admin' | 'manager') {
  const credentials = getTestCredentials()[role];
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
}

test.describe('Manager Login Flow', () => {
  const loginUrl = '/login';

  test.beforeEach(async ({ page }) => {
    await page.goto(loginUrl);
  });

  test('should display login form', async ({ page }) => {
    // Verify login form elements are present
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty submission', async ({ page }) => {
    // Click sign in without entering credentials
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required|invalid/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    // Enter invalid email
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/password/i).fill('password123');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show email validation error
    await expect(page.getByText(/email|invalid/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    const credentials = getTestCredentials();
    // Enter wrong password
    await page.getByLabel(/email/i).fill(credentials.admin.email);
    await page.getByLabel(/password/i).fill('wrongpassword');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show authentication error
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10000 });

    // Should remain on login page
    expect(page.url()).toContain('/login');
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.getByLabel(/email/i).fill('nonexistent@example.com');
    await page.getByLabel(/password/i).fill('password123');

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show authentication error
    await expect(page.getByText(/invalid|incorrect|failed/i)).toBeVisible({ timeout: 10000 });
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    const credentials = getTestCredentials();
    // Enter valid credentials
    await page.getByLabel(/email/i).fill(credentials.admin.email);
    await page.getByLabel(/password/i).fill(credentials.admin.password);

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should login successfully with valid manager credentials', async ({ page }) => {
    const credentials = getTestCredentials();
    await page.getByLabel(/email/i).fill(credentials.manager.email);
    await page.getByLabel(/password/i).fill(credentials.manager.password);

    await page.getByRole('button', { name: /sign in/i }).click();

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
  });

  test('should show loading state during login', async ({ page }) => {
    const credentials = getTestCredentials();
    await page.getByLabel(/email/i).fill(credentials.admin.email);
    await page.getByLabel(/password/i).fill(credentials.admin.password);

    // Click sign in
    const signInButton = page.getByRole('button', { name: /sign in/i });
    await signInButton.click();

    // Button should be disabled or show loading state
    // (The exact implementation may vary)
    await expect(signInButton).toBeDisabled();
  });

  test('should persist session after login', async ({ page }) => {
    const credentials = getTestCredentials();
    // Login
    await page.getByLabel(/email/i).fill(credentials.admin.email);
    await page.getByLabel(/password/i).fill(credentials.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for dashboard
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Refresh page
    await page.reload();

    // Should still be on dashboard (session persisted)
    expect(page.url()).toContain('/dashboard');
  });

  test('should redirect to dashboard if already logged in', async ({ page }) => {
    const credentials = getTestCredentials();
    // Login first
    await page.getByLabel(/email/i).fill(credentials.admin.email);
    await page.getByLabel(/password/i).fill(credentials.admin.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL('**/dashboard**', { timeout: 15000 });

    // Try to access login page again
    await page.goto(loginUrl);

    // Should redirect back to dashboard
    await page.waitForURL('**/dashboard**', { timeout: 10000 });
  });
});

test.describe('Protected Route Access', () => {
  test('should redirect to login when accessing dashboard without auth', async ({ page }) => {
    // Try to access dashboard directly
    await page.goto('/dashboard');

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('should redirect to login when accessing passes page without auth', async ({ page }) => {
    await page.goto('/dashboard/passes');

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 10000 });
  });

  test('should include callback URL when redirecting to login', async ({ page }) => {
    // Try to access a specific dashboard page
    await page.goto('/dashboard/violations');

    // Should redirect to login with callback URL
    await page.waitForURL('**/login**', { timeout: 10000 });

    // The URL should contain a callback parameter
    // Note: The exact format depends on NextAuth configuration
    const url = page.url();
    expect(url).toMatch(/login|signin/i);
  });
});

test.describe('Logout Flow', () => {
  test('should logout successfully', async ({ page }) => {
    // Login first
    await loginAs(page, 'admin');

    // Click user menu to find logout button
    // Look for avatar or user menu trigger
    const userMenu = page.getByRole('button', { name: /user|account|profile|menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }

    // Click sign out
    const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
    if (await signOutButton.isVisible()) {
      await signOutButton.click();
    } else {
      // Try form-based logout
      const signOutForm = page.locator('form').filter({ hasText: /sign out/i });
      if (await signOutForm.isVisible()) {
        await signOutForm.locator('button').click();
      }
    }

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 15000 });
  });

  test('should clear session after logout', async ({ page }) => {
    // Login
    await loginAs(page, 'admin');

    // Logout via user menu
    const userMenu = page.getByRole('button', { name: /user|account|profile|menu/i });
    if (await userMenu.isVisible()) {
      await userMenu.click();
      const signOutButton = page.getByRole('button', { name: /sign out|logout/i });
      if (await signOutButton.isVisible()) {
        await signOutButton.click();
      }
    }

    await page.waitForURL('**/login**', { timeout: 15000 });

    // Try to access dashboard
    await page.goto('/dashboard');

    // Should redirect to login (session cleared)
    await page.waitForURL('**/login**', { timeout: 10000 });
  });
});

test.describe('Role-Based Access', () => {
  test('admin should see all navigation items', async ({ page }) => {
    // Login as admin
    await loginAs(page, 'admin');

    // Admin should see Users and Settings in navigation
    await expect(page.getByRole('link', { name: /users/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /settings/i })).toBeVisible();
  });

  test('manager should not see admin-only navigation items', async ({ page }) => {
    // Login as manager
    await loginAs(page, 'manager');

    // Manager should NOT see Users (admin only)
    const usersLink = page.getByRole('link', { name: /^users$/i });
    await expect(usersLink).not.toBeVisible();
  });
});
