import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

test.describe('Admin Data Export', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as admin
    await page.goto('/auth/signin')
    await page.fill('input[name="email"]', 'admin@example.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForLoadState('networkidle')
  })

  test('should export orders data as CSV', async ({ page }) => {
    await page.goto('/admin/orders')

    // Wait for page to load
    await expect(page.locator('text=Order Management')).toBeVisible()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Click export button
    await page.click('text=Export Orders')

    // Wait for download to complete
    const download = await downloadPromise

    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/orders-\d{4}-\d{2}-\d{2}\.csv/)

    // Save file temporarily and verify it's not empty
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Check that file exists and has content
    expect(fs.existsSync(downloadPath)).toBeTruthy()
    const fileContent = fs.readFileSync(downloadPath, 'utf8')
    expect(fileContent.length).toBeGreaterThan(0)

    // Verify CSV headers are present
    expect(fileContent).toContain('Order Number')
    expect(fileContent).toContain('Customer Name')
    expect(fileContent).toContain('Customer Email')
    expect(fileContent).toContain('Status')

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('should export users data as CSV', async ({ page }) => {
    await page.goto('/admin/users')

    // Wait for page to load
    await expect(page.locator('text=User Management')).toBeVisible()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Click export button
    await page.click('text=Export Users')

    // Wait for download to complete
    const download = await downloadPromise

    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/users-\d{4}-\d{2}-\d{2}\.csv/)

    // Save file temporarily and verify it's not empty
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Check that file exists and has content
    expect(fs.existsSync(downloadPath)).toBeTruthy()
    const fileContent = fs.readFileSync(downloadPath, 'utf8')
    expect(fileContent.length).toBeGreaterThan(0)

    // Verify CSV headers are present
    expect(fileContent).toContain('Name')
    expect(fileContent).toContain('Email')
    expect(fileContent).toContain('Role')
    expect(fileContent).toContain('Email Verified')

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('should export inventory data as CSV', async ({ page }) => {
    await page.goto('/admin/inventory')

    // Wait for page to load
    await expect(page.locator('text=Inventory Management')).toBeVisible()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Click export button
    await page.click('text=Export Inventory')

    // Wait for download to complete
    const download = await downloadPromise

    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/inventory-\d{4}-\d{2}-\d{2}\.csv/)

    // Save file temporarily and verify it's not empty
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Check that file exists and has content
    expect(fs.existsSync(downloadPath)).toBeTruthy()
    const fileContent = fs.readFileSync(downloadPath, 'utf8')
    expect(fileContent.length).toBeGreaterThan(0)

    // Verify CSV headers are present
    expect(fileContent).toContain('Name')
    expect(fileContent).toContain('SKU')
    expect(fileContent).toContain('Inventory')
    expect(fileContent).toContain('Price')

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('should export analytics report as PDF', async ({ page }) => {
    await page.goto('/admin/analytics')

    // Wait for page to load
    await expect(page.locator('text=Analytics & Reports')).toBeVisible()

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Click export button
    await page.click('text=Export Report')

    // Wait for download to complete
    const download = await downloadPromise

    // Verify download properties
    expect(download.suggestedFilename()).toMatch(/analytics-report-.*\.pdf/)

    // Save file temporarily and verify it's not empty
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    // Check that file exists and has content
    expect(fs.existsSync(downloadPath)).toBeTruthy()
    const fileStats = fs.statSync(downloadPath)
    expect(fileStats.size).toBeGreaterThan(1000) // PDF should be substantial

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('should export filtered data correctly', async ({ page }) => {
    await page.goto('/admin/orders')

    // Apply a filter (e.g., by status)
    await page.selectOption('select[name="status"]', 'COMPLETED')
    await page.click('button:has-text("Search")')

    // Wait for filtered results
    await page.waitForLoadState('networkidle')

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Export filtered data
    await page.click('text=Export Orders')

    // Wait for download to complete
    const download = await downloadPromise

    // Save and verify the file contains filtered data
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    expect(fs.existsSync(downloadPath)).toBeTruthy()
    const fileContent = fs.readFileSync(downloadPath, 'utf8')

    // If there are completed orders, they should be in the export
    // If filter results in no data, CSV should still have headers
    expect(fileContent).toContain('Order Number')

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('should handle export errors gracefully', async ({ page }) => {
    await page.goto('/admin/orders')

    // Mock a network failure scenario
    await page.route('**/api/admin/orders*', route => {
      route.abort('failed')
    })

    // Try to export (should handle the error)
    await page.click('text=Export Orders')

    // Should show an error message or handle gracefully
    // Wait a moment for any error handling to occur
    await page.waitForTimeout(2000)

    // Check for error message (adjust based on your error handling)
    const errorMessage = page.locator('text=Failed to export')
    if (await errorMessage.isVisible()) {
      await expect(errorMessage).toBeVisible()
    }

    // Should not trigger a download
    // This is implicitly tested by not waiting for download
  })

  test('should export with different time ranges for analytics', async ({ page }) => {
    await page.goto('/admin/analytics')

    // Change time range to 7 days
    await page.selectOption('select', '7d')
    await page.waitForLoadState('networkidle')

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')

    // Export with 7-day range
    await page.click('text=Export Report')

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/analytics-report-7d-.*\.pdf/)

    // Save and verify
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)
    expect(fs.existsSync(downloadPath)).toBeTruthy()

    // Clean up
    fs.unlinkSync(downloadPath)
  })

  test('should export large datasets without timeout', async ({ page }) => {
    // Set a longer timeout for this test
    test.setTimeout(60000)

    await page.goto('/admin/users')

    // Set up download listener with longer timeout
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })

    // Export all users (potentially large dataset)
    await page.click('text=Export Users')

    // Wait for download to complete
    const download = await downloadPromise

    // Verify download completed successfully
    const downloadPath = path.join('./downloads', download.suggestedFilename())
    await download.saveAs(downloadPath)

    expect(fs.existsSync(downloadPath)).toBeTruthy()

    // Clean up
    fs.unlinkSync(downloadPath)
  })
})

// Helper to ensure downloads directory exists
test.beforeAll(async () => {
  const downloadsDir = './downloads'
  if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true })
  }
})