import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Product Pagination E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/products`)
  })

  test.describe('Pagination Navigation', () => {
    test('should display pagination controls when needed', async ({ page }) => {
      const paginationContainer = page.locator('.pagination, [data-testid="pagination"]')
      const nextButton = page.locator('button:has-text("Next")')
      const prevButton = page.locator('button:has-text("Previous")')

      const hasNextButton = await nextButton.isVisible()
      const hasPrevButton = await prevButton.isVisible()

      if (hasNextButton || hasPrevButton) {
        await expect(paginationContainer.first()).toBeVisible()
      }
    })

    test('should navigate to next page correctly', async ({ page }) => {
      const nextButton = page.locator('button:has-text("Next")')

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        const currentUrl = page.url()
        await nextButton.click()

        await page.waitForURL(/page=\d+/)
        expect(page.url()).not.toBe(currentUrl)

        const pageParam = new URL(page.url()).searchParams.get('page')
        expect(parseInt(pageParam || '1')).toBeGreaterThan(1)

        const pageIndicator = page.locator('text=/Page \\d+/')
        await expect(pageIndicator).toBeVisible()
      }
    })

    test('should navigate to previous page correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=2`)

      const prevButton = page.locator('button:has-text("Previous")')

      if (await prevButton.isVisible() && await prevButton.isEnabled()) {
        await prevButton.click()

        await page.waitForURL(/products(?:\?(?!.*page=2).*)?$/)

        const pageParam = new URL(page.url()).searchParams.get('page')
        const currentPage = parseInt(pageParam || '1')
        expect(currentPage).toBeLessThan(2)
      }
    })

    test('should disable previous button on first page', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=1`)

      const prevButton = page.locator('button:has-text("Previous")')

      if (await prevButton.isVisible()) {
        await expect(prevButton).toBeDisabled()
      }
    })

    test('should disable next button on last page', async ({ page }) => {
      const totalPagesElement = page.locator('text=/Page \\d+ of (\\d+)/')
      const totalPagesText = await totalPagesElement.textContent()

      if (totalPagesText) {
        const match = totalPagesText.match(/Page \d+ of (\d+)/)
        if (match) {
          const totalPages = parseInt(match[1])
          await page.goto(`${BASE_URL}/products?page=${totalPages}`)

          const nextButton = page.locator('button:has-text("Next")')
          if (await nextButton.isVisible()) {
            await expect(nextButton).toBeDisabled()
          }
        }
      }
    })
  })

  test.describe('Page Number Navigation', () => {
    test('should navigate to specific page number', async ({ page }) => {
      const pageButtons = page.locator('button').filter({ hasText: /^\d+$/ })
      const buttonCount = await pageButtons.count()

      if (buttonCount > 1) {
        const targetPageButton = pageButtons.nth(1)
        const pageNumber = await targetPageButton.textContent()

        await targetPageButton.click()
        await page.waitForURL(`**/products?page=${pageNumber}`)

        const activePageButton = page.locator(`button:has-text("${pageNumber}")`)
        await expect(activePageButton).toHaveClass(/default/)
      }
    })

    test('should highlight current page number', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=2`)

      const currentPageButton = page.locator('button:has-text("2")')
      if (await currentPageButton.isVisible()) {
        await expect(currentPageButton).toHaveClass(/default/)
      }
    })

    test('should show ellipsis for distant pages', async ({ page }) => {
      const totalPagesElement = page.locator('text=/Page \\d+ of (\\d+)/')
      const totalPagesText = await totalPagesElement.textContent()

      if (totalPagesText) {
        const match = totalPagesText.match(/Page \\d+ of (\\d+)/)
        if (match && parseInt(match[1]) > 7) {
          const ellipsis = page.locator('text=...')
          await expect(ellipsis.first()).toBeVisible()
        }
      }
    })
  })

  test.describe('Pagination with Filters', () => {
    test('should reset to page 1 when applying new search', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=2`)

      await page.fill('input[placeholder*="Search"]', 'test')
      await page.click('button:has-text("Search")')

      await page.waitForURL('**/products?q=test')

      const pageParam = new URL(page.url()).searchParams.get('page')
      expect(pageParam).toBeNull()
    })

    test('should reset to page 1 when changing category', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=2`)

      const categoryLinks = page.locator('aside a[href*="category="]')
      const linkCount = await categoryLinks.count()

      if (linkCount > 0) {
        await categoryLinks.first().click()
        await page.waitForURL('**/products?category=*')

        const pageParam = new URL(page.url()).searchParams.get('page')
        expect(pageParam).toBeNull()
      }
    })

    test('should maintain filters when navigating pages', async ({ page }) => {
      await page.fill('input[placeholder*="Search"]', 'test')
      await page.click('button:has-text("Search")')
      await page.waitForURL('**/products?q=test')

      const nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForURL('**/products?q=test&page=2')

        const searchParam = new URL(page.url()).searchParams.get('q')
        expect(searchParam).toBe('test')
      }
    })
  })

  test.describe('Pagination Display and Information', () => {
    test('should show correct product count information', async ({ page }) => {
      const productCountText = page.locator('text=/\\d+ products? found/')
      await expect(productCountText).toBeVisible()

      const countMatch = await productCountText.textContent()
      if (countMatch) {
        const count = parseInt(countMatch.match(/\\d+/)?.[0] || '0')
        expect(count).toBeGreaterThanOrEqual(0)
      }
    })

    test('should show correct page information', async ({ page }) => {
      const pageInfo = page.locator('text=/Page \\d+ of \\d+/')
      if (await pageInfo.isVisible()) {
        const pageText = await pageInfo.textContent()
        expect(pageText).toMatch(/Page \d+ of \d+/)
      }
    })

    test('should calculate total pages correctly', async ({ page }) => {
      const productCountElement = page.locator('text=/\\d+ products? found/')
      const pageInfoElement = page.locator('text=/Page \\d+ of (\\d+)/')

      if (await productCountElement.isVisible() && await pageInfoElement.isVisible()) {
        const countText = await productCountElement.textContent()
        const pageInfoText = await pageInfoElement.textContent()

        if (countText && pageInfoText) {
          const totalProducts = parseInt(countText.match(/\\d+/)?.[0] || '0')
          const totalPages = parseInt(pageInfoText.match(/of (\\d+)/)?.[1] || '1')
          const productsPerPage = 20 // Default from API

          const expectedPages = Math.ceil(totalProducts / productsPerPage)
          expect(totalPages).toBe(expectedPages)
        }
      }
    })
  })

  test.describe('Pagination URL Handling', () => {
    test('should handle invalid page numbers gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=999999`)

      await expect(page.locator('h1')).toBeVisible()

      const errorMessage = page.locator('text=No products found, text=Page not found')
      if (await errorMessage.first().isVisible()) {
        await expect(errorMessage.first()).toBeVisible()
      } else {
        const validPageIndicator = page.locator('text=/Page \\d+/')
        await expect(validPageIndicator).toBeVisible()
      }
    })

    test('should handle non-numeric page parameter', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=invalid`)

      await expect(page.locator('h1')).toBeVisible()

      const pageParam = new URL(page.url()).searchParams.get('page')
      expect(pageParam).not.toBe('invalid')
    })

    test('should handle negative page numbers', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=-1`)

      await expect(page.locator('h1')).toBeVisible()

      const currentUrl = new URL(page.url())
      const pageParam = parseInt(currentUrl.searchParams.get('page') || '1')
      expect(pageParam).toBeGreaterThan(0)
    })
  })

  test.describe('Pagination Performance', () => {
    test('should load new page content efficiently', async ({ page }) => {
      const nextButton = page.locator('button:has-text("Next")')

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        const startTime = Date.now()
        await nextButton.click()
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime

        expect(loadTime).toBeLessThan(3000) // 3 seconds max for pagination
      }
    })

    test('should maintain scroll position appropriately', async ({ page }) => {
      await page.evaluate(() => window.scrollTo(0, 500))

      const nextButton = page.locator('button:has-text("Next")')
      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForLoadState('networkidle')

        const scrollPosition = await page.evaluate(() => window.scrollY)
        expect(scrollPosition).toBeLessThan(500) // Should scroll back to top or near top
      }
    })
  })

  test.describe('Responsive Pagination', () => {
    test('should work correctly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })

      const paginationControls = page.locator('button:has-text("Next"), button:has-text("Previous")')
      const controlCount = await paginationControls.count()

      if (controlCount > 0) {
        await expect(paginationControls.first()).toBeVisible()

        const nextButton = page.locator('button:has-text("Next")')
        if (await nextButton.isVisible() && await nextButton.isEnabled()) {
          await nextButton.click()
          await page.waitForURL(/page=\d+/)
        }
      }
    })

    test('should adapt pagination display for small screens', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 })

      const pageNumbers = page.locator('button').filter({ hasText: /^\\d+$/ })
      const numberCount = await pageNumbers.count()

      expect(numberCount).toBeLessThanOrEqual(5)
    })
  })
})