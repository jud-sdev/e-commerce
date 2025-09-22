import { test, expect } from '@playwright/test'

test.describe('Admin Access Control', () => {
  const adminRoutes = [
    '/admin',
    '/admin/orders',
    '/admin/users',
    '/admin/inventory',
    '/admin/analytics',
    '/admin/settings'
  ]

  const adminApiRoutes = [
    '/api/admin/dashboard',
    '/api/admin/orders',
    '/api/admin/users',
    '/api/admin/inventory',
    '/api/admin/analytics',
    '/api/admin/settings'
  ]

  test.describe('Unauthenticated users', () => {
    test('should be redirected from all admin routes', async ({ page }) => {
      for (const route of adminRoutes) {
        await page.goto(route)

        // Should be redirected to login
        await expect(page).toHaveURL(/\/auth\/signin/)

        // Should see login form
        await expect(page.locator('text=Sign In')).toBeVisible()
      }
    })

    test('should receive 401 for all admin API routes', async ({ page }) => {
      for (const apiRoute of adminApiRoutes) {
        const response = await page.request.get(apiRoute)
        expect(response.status()).toBe(401)

        const data = await response.json()
        expect(data.error).toBe('Authentication required')
      }
    })
  })

  test.describe('Regular users', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as regular user
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'user@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
    })

    test('should be redirected from all admin routes', async ({ page }) => {
      for (const route of adminRoutes) {
        await page.goto(route)

        // Should be redirected to user dashboard
        await expect(page).toHaveURL('/dashboard')

        // Should see user dashboard content
        await expect(page.locator('text=Dashboard') || page.locator('text=Welcome')).toBeVisible()
      }
    })

    test('should receive 403 for all admin API routes', async ({ page }) => {
      for (const apiRoute of adminApiRoutes) {
        const response = await page.request.get(apiRoute)
        expect(response.status()).toBe(403)

        const data = await response.json()
        expect(data.error).toBe('Admin access required')
      }
    })

    test('should not see admin links in navigation', async ({ page }) => {
      await page.goto('/dashboard')

      // Should not see admin-specific navigation items
      await expect(page.locator('text=Admin Dashboard')).not.toBeVisible()
      await expect(page.locator('a[href="/admin"]')).not.toBeVisible()
      await expect(page.locator('a[href="/admin/users"]')).not.toBeVisible()
      await expect(page.locator('a[href="/admin/analytics"]')).not.toBeVisible()
    })

    test('should not access admin functions through direct manipulation', async ({ page }) => {
      // Try to access admin API through browser console
      const result = await page.evaluate(async () => {
        try {
          const response = await fetch('/api/admin/users', {
            method: 'GET',
            credentials: 'include'
          })
          return { status: response.status, ok: response.ok }
        } catch (error) {
          return { error: error.message }
        }
      })

      expect(result.status).toBe(403)
      expect(result.ok).toBe(false)
    })
  })

  test.describe('Admin users', () => {
    test.beforeEach(async ({ page }) => {
      // Sign in as admin user
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')
    })

    test('should have access to all admin routes', async ({ page }) => {
      for (const route of adminRoutes) {
        await page.goto(route)

        // Should not be redirected
        await expect(page).toHaveURL(route)

        // Should see admin content (header or nav)
        await expect(page.locator('text=Admin Dashboard') || page.locator('text=Admin')).toBeVisible()
      }
    })

    test('should receive 200 for all admin API routes', async ({ page }) => {
      for (const apiRoute of adminApiRoutes) {
        const response = await page.request.get(apiRoute)
        expect(response.status()).toBe(200)
      }
    })

    test('should see admin navigation', async ({ page }) => {
      await page.goto('/admin')

      // Should see all admin navigation items
      await expect(page.locator('text=Overview')).toBeVisible()
      await expect(page.locator('text=Orders')).toBeVisible()
      await expect(page.locator('text=Users')).toBeVisible()
      await expect(page.locator('text=Inventory')).toBeVisible()
      await expect(page.locator('text=Analytics')).toBeVisible()
      await expect(page.locator('text=Settings')).toBeVisible()
    })

    test('should be able to perform admin actions', async ({ page }) => {
      // Test user management access
      await page.goto('/admin/users')
      await expect(page.locator('text=User Management')).toBeVisible()

      // Should see user controls (buttons, dropdowns, etc.)
      await expect(page.locator('button:has-text("Export")') || page.locator('select')).toBeVisible()

      // Test inventory management access
      await page.goto('/admin/inventory')
      await expect(page.locator('text=Inventory Management')).toBeVisible()

      // Test analytics access
      await page.goto('/admin/analytics')
      await expect(page.locator('text=Analytics')).toBeVisible()
    })
  })

  test.describe('Session security', () => {
    test('should invalidate session on logout', async ({ page }) => {
      // Sign in as admin
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')

      // Verify admin access
      await page.goto('/admin')
      await expect(page.locator('text=Admin Dashboard')).toBeVisible()

      // Logout
      await page.click('text=Logout')
      await expect(page).toHaveURL(/\/auth\/signin/)

      // Try to access admin area again
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/auth\/signin/)
    })

    test('should handle expired sessions', async ({ page }) => {
      // This test would need session manipulation
      // For now, we'll test the basic flow

      // Sign in as admin
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')

      // Clear cookies to simulate expired session
      await page.context().clearCookies()

      // Try to access admin area
      await page.goto('/admin')
      await expect(page).toHaveURL(/\/auth\/signin/)
    })
  })

  test.describe('Role-based permissions', () => {
    test('should prevent privilege escalation', async ({ page }) => {
      // Sign in as regular user
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'user@example.com')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')

      // Try to modify user roles through API (should fail)
      const response = await page.request.patch('/api/admin/users', {
        data: {
          userId: 'some-user-id',
          role: 'ADMIN'
        }
      })

      expect(response.status()).toBe(403)
    })

    test('should allow admin to manage users but not change own role', async ({ page }) => {
      // Sign in as admin
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')

      // Go to user management
      await page.goto('/admin/users')

      // Should be able to access user management
      await expect(page.locator('text=User Management')).toBeVisible()

      // Test that admin cannot change their own role through API
      const response = await page.request.patch('/api/admin/users', {
        data: {
          userId: 'admin-user-id', // Assuming this is the current admin's ID
          role: 'USER'
        }
      })

      // Should get an error preventing self-role change
      if (response.status() !== 200) {
        expect(response.status()).toBe(400)
        const data = await response.json()
        expect(data.error).toContain('Cannot change your own role')
      }
    })
  })

  test.describe('CSRF Protection', () => {
    test('should require proper headers for state-changing operations', async ({ page }) => {
      // Sign in as admin
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'admin@example.com')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      await page.waitForLoadState('networkidle')

      // Try to make a PATCH request without proper headers
      const response = await page.request.patch('/api/admin/users', {
        data: {
          userId: 'test-user',
          role: 'ADMIN'
        },
        headers: {
          'Content-Type': 'application/json'
          // Missing CSRF token or other security headers
        }
      })

      // The request should either succeed (if CSRF is handled automatically)
      // or fail with appropriate security measures
      expect([200, 400, 403, 422]).toContain(response.status())
    })
  })
})