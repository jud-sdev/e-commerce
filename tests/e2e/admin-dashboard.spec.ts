import { test, expect } from '@playwright/test'

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Assume we have a way to authenticate as admin
    // In a real app, you'd use test setup helpers or fixtures
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')

    // Navigate to admin dashboard
    await page.goto('/admin')
  })

  test('should display overview statistics', async ({ page }) => {
    // Check for overview cards
    await expect(page.locator('text=Total Products')).toBeVisible()
    await expect(page.locator('text=Total Orders')).toBeVisible()
    await expect(page.locator('text=Total Users')).toBeVisible()
    await expect(page.locator('text=Total Revenue')).toBeVisible()

    // Check that statistics have values
    const revenueCard = page.locator('text=Total Revenue').locator('..')
    await expect(revenueCard.locator('text=/\\$\\d+/')).toBeVisible()
  })

  test('should display low stock products', async ({ page }) => {
    await expect(page.locator('text=Low Stock Products')).toBeVisible()

    // Should show either products or "No low stock products" message
    const lowStockSection = page.locator('text=Low Stock Products').locator('..')
    const hasProducts = await lowStockSection.locator('text=/\\d+ units left/').count()
    const hasNoProducts = await lowStockSection.locator('text=No low stock products').count()

    expect(hasProducts > 0 || hasNoProducts > 0).toBeTruthy()
  })

  test('should display recent orders', async ({ page }) => {
    await expect(page.locator('text=Recent Orders')).toBeVisible()

    // Should show either orders or "No recent orders" message
    const ordersSection = page.locator('text=Recent Orders').locator('..')
    const hasOrders = await ordersSection.locator('text=/ORD-\\d+/').count()
    const hasNoOrders = await ordersSection.locator('text=No recent orders').count()

    expect(hasOrders > 0 || hasNoOrders > 0).toBeTruthy()
  })

  test('should display top products', async ({ page }) => {
    await expect(page.locator('text=Top Products')).toBeVisible()

    // Should show either products or "No sales data" message
    const topProductsSection = page.locator('text=Top Products').locator('..')
    const hasProducts = await topProductsSection.locator('text=/\\d+ sold/').count()
    const hasNoProducts = await topProductsSection.locator('text=No sales data').count()

    expect(hasProducts > 0 || hasNoProducts > 0).toBeTruthy()
  })

  test('should navigate to different admin sections', async ({ page }) => {
    // Test navigation to orders
    await page.click('text=Orders')
    await expect(page).toHaveURL(/\/admin\/orders/)
    await expect(page.locator('text=Order Management')).toBeVisible()

    // Test navigation to users
    await page.click('text=Users')
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.locator('text=User Management')).toBeVisible()

    // Test navigation to inventory
    await page.click('text=Inventory')
    await expect(page).toHaveURL(/\/admin\/inventory/)
    await expect(page.locator('text=Inventory Management')).toBeVisible()

    // Test navigation to analytics
    await page.click('text=Analytics')
    await expect(page).toHaveURL(/\/admin\/analytics/)
    await expect(page.locator('text=Analytics & Reports')).toBeVisible()

    // Test navigation to settings
    await page.click('text=Settings')
    await expect(page).toHaveURL(/\/admin\/settings/)
    await expect(page.locator('text=Settings')).toBeVisible()

    // Test navigation back to overview
    await page.click('text=Overview')
    await expect(page).toHaveURL(/\/admin$/)
  })

  test('should handle loading states gracefully', async ({ page }) => {
    // Navigate to admin and check for loading indicators
    await page.goto('/admin')

    // Check that content loads (no permanent loading state)
    await expect(page.locator('text=Total Products')).toBeVisible({ timeout: 10000 })

    // Should not show loading text after data is loaded
    await expect(page.locator('text=Loading dashboard data...')).not.toBeVisible()
  })

  test('should handle errors gracefully', async ({ page }) => {
    // This test might need to mock API failures to be more effective
    // For now, we'll just check that error messages are handled properly

    // Navigate to admin
    await page.goto('/admin')

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check that we don't see any uncaught error messages
    const errorMessages = [
      'Failed to load dashboard data',
      'Error loading data',
      'Something went wrong'
    ]

    for (const errorMessage of errorMessages) {
      await expect(page.locator(`text=${errorMessage}`)).not.toBeVisible()
    }
  })

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto('/admin')

    // Check that mobile navigation works
    await expect(page.locator('text=Admin Dashboard')).toBeVisible()

    // Check that statistics cards are still visible and properly formatted
    await expect(page.locator('text=Total Products')).toBeVisible()
    await expect(page.locator('text=Total Orders')).toBeVisible()

    // Navigation should still work on mobile
    await page.click('text=Orders')
    await expect(page).toHaveURL(/\/admin\/orders/)
  })
})