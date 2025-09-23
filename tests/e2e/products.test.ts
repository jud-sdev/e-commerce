import { test, expect } from '@playwright/test'
import { faker } from '@faker-js/faker'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Product Catalog E2E Tests', () => {
  let adminEmail: string
  let adminPassword: string

  test.beforeAll(async () => {
    adminEmail = 'admin@test.com'
    adminPassword = faker.internet.password({ length: 10 })
  })

  test.describe('Product Search and Filtering', () => {
    test('should display products page with search functionality', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      await expect(page.locator('h1')).toContainText('All Products')
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()
      await expect(page.locator('button:has-text("Search")')).toBeVisible()
      await expect(page.locator('button:has-text("Filters")')).toBeVisible()
    })

    test('should search for products by name', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const searchTerm = 'test'
      await page.fill('input[placeholder*="Search"]', searchTerm)
      await page.click('button:has-text("Search")')

      await page.waitForURL(`**/products?q=${searchTerm}`)

      if (await page.locator('.grid .product-card').count() > 0) {
        await expect(page.locator('.product-card')).toBeVisible()
      } else {
        await expect(page.locator('text=No products found')).toBeVisible()
      }
    })

    test('should open and use filter dialog', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      await page.click('button:has-text("Filters")')
      await expect(page.locator('[role="dialog"]')).toBeVisible()
      await expect(page.locator('text=Filter Products')).toBeVisible()

      const sortButtons = page.locator('button:has-text("Newest First"), button:has-text("Price Low to High")')
      await expect(sortButtons.first()).toBeVisible()

      await page.click('button:has-text("Apply Filters")')
      await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    })

    test('should filter by category', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const categoryLinks = page.locator('aside a[href*="category="]')
      const categoryCount = await categoryLinks.count()

      if (categoryCount > 0) {
        const firstCategory = categoryLinks.first()
        await firstCategory.click()

        await page.waitForURL('**/products?category=*')
        await expect(page.locator('h1')).not.toContainText('All Products')
      }
    })

    test('should sort products by price', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      await page.click('button:has-text("Filters")')
      await page.click('button:has-text("Price Low to High")')
      await page.click('button:has-text("Apply Filters")')

      await page.waitForURL('**/products?sortBy=price&sortOrder=asc')

      const priceElements = page.locator('.product-card .font-bold')
      const priceCount = await priceElements.count()

      if (priceCount >= 2) {
        const prices = await priceElements.allTextContents()
        const numericPrices = prices.map(price =>
          parseFloat(price.replace(/[^0-9.]/g, ''))
        ).filter(price => !isNaN(price))

        if (numericPrices.length >= 2) {
          expect(numericPrices[0]).toBeLessThanOrEqual(numericPrices[1])
        }
      }
    })

    test('should clear all filters', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?q=test&category=123`)

      await page.click('button:has-text("Filters")')
      await page.click('button:has-text("Clear All")')

      await page.waitForURL(`${BASE_URL}/products`)
      await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('')
    })

    test('should remove individual filters', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      await page.fill('input[placeholder*="Search"]', 'test')
      await page.click('button:has-text("Search")')

      await page.waitForURL('**/products?q=test')

      const clearButton = page.locator('button:has-text("Clear All")')
      if (await clearButton.isVisible()) {
        await clearButton.click()
        await expect(page.locator('input[placeholder*="Search"]')).toHaveValue('')
      }
    })
  })

  test.describe('Product Pagination', () => {
    test('should navigate through product pages', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const nextButton = page.locator('button:has-text("Next")')
      const prevButton = page.locator('button:has-text("Previous")')

      if (await nextButton.isVisible() && await nextButton.isEnabled()) {
        await nextButton.click()
        await page.waitForURL('**/products?page=2')
        await expect(page.locator('text=Page 2')).toBeVisible()

        if (await prevButton.isVisible() && await prevButton.isEnabled()) {
          await prevButton.click()
          await page.waitForURL(/products(\?|$)/)
        }
      }
    })

    test('should display correct pagination info', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const paginationInfo = page.locator('text=/\\d+ products? found/')
      await expect(paginationInfo).toBeVisible()

      const pageNumbers = page.locator('button[variant="default"], button[variant="outline"]').filter({ hasText: /^\d+$/ })
      const pageCount = await pageNumbers.count()

      if (pageCount > 0) {
        await expect(pageNumbers.first()).toBeVisible()
      }
    })

    test('should handle direct page navigation', async ({ page }) => {
      await page.goto(`${BASE_URL}/products?page=1`)

      await expect(page.locator('h1')).toContainText('All Products')

      const pageButtons = page.locator('button').filter({ hasText: /^\d+$/ })
      const buttonCount = await pageButtons.count()

      if (buttonCount > 1) {
        const secondPageButton = pageButtons.nth(1)
        await secondPageButton.click()
        await expect(page.url()).toContain('page=2')
      }
    })
  })

  test.describe('Product Details Page', () => {
    test('should display product details correctly', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const productLinks = page.locator('a[href*="/products/"]')
      const linkCount = await productLinks.count()

      if (linkCount > 0) {
        const firstProduct = productLinks.first()
        await firstProduct.click()

        await page.waitForURL('**/products/**')

        await expect(page.locator('h1')).toBeVisible()
        await expect(page.locator('text=/\\$\\d+/')).toBeVisible()
        await expect(page.locator('button:has-text("Add to Cart"), text=Out of Stock')).toBeVisible()
      }
    })

    test('should display product gallery', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const productLinks = page.locator('a[href*="/products/"]')
      const linkCount = await productLinks.count()

      if (linkCount > 0) {
        await productLinks.first().click()
        await page.waitForURL('**/products/**')

        const mainImage = page.locator('img').first()
        await expect(mainImage).toBeVisible()

        const galleryThumbnails = page.locator('button img')
        const thumbnailCount = await galleryThumbnails.count()

        if (thumbnailCount > 1) {
          await galleryThumbnails.nth(1).click()
          await expect(mainImage).toBeVisible()
        }
      }
    })

    test('should show product information tabs or sections', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const productLinks = page.locator('a[href*="/products/"]')
      const linkCount = await productLinks.count()

      if (linkCount > 0) {
        await productLinks.first().click()
        await page.waitForURL('**/products/**')

        await expect(page.locator('text=Description, text=Product Details')).toBeVisible()

        const stockInfo = page.locator('text=/\\d+ in stock/, text=Out of Stock')
        await expect(stockInfo).toBeVisible()
      }
    })
  })

  test.describe('Category Pages', () => {
    test('should display category page with products', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const categoryLinks = page.locator('aside a[href*="/categories/"]')
      const linkCount = await categoryLinks.count()

      if (linkCount > 0) {
        await categoryLinks.first().click()
        await page.waitForURL('**/categories/**')

        await expect(page.locator('h1')).toBeVisible()
        await expect(page.locator('text=/\\d+ products? found/')).toBeVisible()
      }
    })

    test('should show category breadcrumbs', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const categoryLinks = page.locator('aside a[href*="/categories/"]')
      const linkCount = await categoryLinks.count()

      if (linkCount > 0) {
        await categoryLinks.first().click()
        await page.waitForURL('**/categories/**')

        const breadcrumbs = page.locator('text=Home, text=Products')
        await expect(breadcrumbs.first()).toBeVisible()
      }
    })
  })

  test.describe('Product Card Interactions', () => {
    test('should display product cards with correct information', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const productCards = page.locator('.product-card, [data-testid="product-card"]')
      const cardCount = await productCards.count()

      if (cardCount > 0) {
        const firstCard = productCards.first()

        await expect(firstCard.locator('text=/\\$\\d+/')).toBeVisible()
        await expect(firstCard.locator('button, a')).toBeVisible()

        const cardTitle = firstCard.locator('h2, h3, .font-bold').first()
        await expect(cardTitle).toBeVisible()
      }
    })

    test('should handle out of stock products', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const outOfStockProducts = page.locator('text=Out of Stock').first()
      if (await outOfStockProducts.isVisible()) {
        const parentCard = outOfStockProducts.locator('..')
        const addToCartButton = parentCard.locator('button:has-text("Add to Cart")')

        if (await addToCartButton.isVisible()) {
          await expect(addToCartButton).toBeDisabled()
        }
      }
    })

    test('should show featured product badges', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const featuredBadges = page.locator('text=Featured')
      const badgeCount = await featuredBadges.count()

      if (badgeCount > 0) {
        await expect(featuredBadges.first()).toBeVisible()
      }
    })
  })

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto(`${BASE_URL}/products`)

      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()

      const productGrid = page.locator('.grid')
      await expect(productGrid).toBeVisible()
    })

    test('should work on tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.goto(`${BASE_URL}/products`)

      await expect(page.locator('h1')).toBeVisible()

      const productCards = page.locator('.product-card, [data-testid="product-card"]')
      const cardCount = await productCards.count()

      if (cardCount > 0) {
        await expect(productCards.first()).toBeVisible()
      }
    })
  })

  test.describe('Search Results Handling', () => {
    test('should handle empty search results', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const uniqueSearchTerm = `nonexistent-${Date.now()}`
      await page.fill('input[placeholder*="Search"]', uniqueSearchTerm)
      await page.click('button:has-text("Search")')

      await page.waitForURL(`**/products?q=${uniqueSearchTerm}`)

      const noResultsMessage = page.locator('text=No products found, text=Try adjusting')
      await expect(noResultsMessage.first()).toBeVisible()
    })

    test('should maintain search state on page reload', async ({ page }) => {
      const searchTerm = 'test'
      await page.goto(`${BASE_URL}/products?q=${searchTerm}`)

      await expect(page.locator('input[placeholder*="Search"]')).toHaveValue(searchTerm)

      await page.reload()
      await expect(page.locator('input[placeholder*="Search"]')).toHaveValue(searchTerm)
    })
  })

  test.describe('Performance and Loading', () => {
    test('should load products page within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto(`${BASE_URL}/products`)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      expect(loadTime).toBeLessThan(5000) // 5 seconds max
    })

    test('should show loading states appropriately', async ({ page }) => {
      await page.goto(`${BASE_URL}/products`)

      const searchInput = page.locator('input[placeholder*="Search"]')
      await searchInput.fill('test')

      const searchButton = page.locator('button:has-text("Search")')
      await searchButton.click()

      await page.waitForURL('**/products?q=test')
    })
  })
})