import { test, expect } from '@playwright/test'

test.describe('Admin Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the admin page which should redirect to login if not authenticated
    await page.goto('/admin')
  })

  test('should redirect non-authenticated users to login', async ({ page }) => {
    // Should be redirected to login page
    await expect(page).toHaveURL(/\/auth\/signin/)
    await expect(page.locator('text=Sign In')).toBeVisible()
  })

  test('should redirect regular users away from admin', async ({ page }) => {
    // First, let's navigate to the sign-in page if not already there
    if (!page.url().includes('/auth/signin')) {
      await page.goto('/auth/signin')
    }

    // Sign in as a regular user (assuming we have test credentials)
    await page.fill('input[name="email"]', 'user@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for redirect after login
    await page.waitForURL('/dashboard')

    // Now try to access admin area
    await page.goto('/admin')

    // Should be redirected back to user dashboard
    await expect(page).toHaveURL('/dashboard')
  })

  test('should allow admin users to access admin area', async ({ page }) => {
    // First, let's navigate to the sign-in page if not already there
    if (!page.url().includes('/auth/signin')) {
      await page.goto('/auth/signin')
    }

    // Sign in as an admin user (assuming we have test credentials)
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // Wait for potential redirect
    await page.waitForLoadState('networkidle')

    // Now try to access admin area
    await page.goto('/admin')

    // Should see admin dashboard
    await expect(page.locator('text=Admin Dashboard')).toBeVisible()
    await expect(page.locator('text=Overview')).toBeVisible()
  })

  test('should display admin navigation for admin users', async ({ page }) => {
    // Assume admin is already logged in from previous test or setup
    await page.goto('/admin')

    // Check for admin navigation items
    await expect(page.locator('text=Overview')).toBeVisible()
    await expect(page.locator('text=Products')).toBeVisible()
    await expect(page.locator('text=Orders')).toBeVisible()
    await expect(page.locator('text=Users')).toBeVisible()
    await expect(page.locator('text=Inventory')).toBeVisible()
    await expect(page.locator('text=Analytics')).toBeVisible()
    await expect(page.locator('text=Settings')).toBeVisible()
  })

  test('should not display admin navigation for regular users', async ({ page }) => {
    // Sign in as regular user and check main navigation
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'user@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL('/dashboard')

    // Should not see admin navigation
    await expect(page.locator('text=Admin Dashboard')).not.toBeVisible()
    await expect(page.locator('text=Inventory')).not.toBeVisible()
    await expect(page.locator('text=Analytics')).not.toBeVisible()
  })

  test('should logout admin user successfully', async ({ page }) => {
    // Assume admin is logged in
    await page.goto('/admin')

    // Find and click logout button
    await page.click('text=Logout')

    // Should be redirected to login
    await expect(page).toHaveURL(/\/auth\/signin/)

    // Trying to access admin again should redirect to login
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/auth\/signin/)
  })
})