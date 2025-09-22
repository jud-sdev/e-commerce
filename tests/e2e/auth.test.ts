import { test, expect } from '@playwright/test'
import { faker } from '@faker-js/faker'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'

test.describe('Authentication E2E Tests', () => {
  let testEmail: string
  let testPassword: string
  let testName: string

  test.beforeEach(async () => {
    testEmail = faker.internet.email()
    testPassword = faker.internet.password({ length: 10 })
    testName = faker.person.fullName()
  })

  test.describe('Registration Flow', () => {
    test('should successfully register a new user', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)

      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)

      await page.click('button[type="submit"]')

      await page.waitForURL('**/dashboard', { timeout: 10000 })

      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('text=' + testEmail)).toBeVisible()
    })

    test('should show error for duplicate email', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)

      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', 'duplicate@test.com')
      await page.fill('input[name="password"]', testPassword)

      await page.click('button[type="submit"]')

      await page.fill('input[name="name"]', 'Another User')
      await page.fill('input[name="email"]', 'duplicate@test.com')
      await page.fill('input[name="password"]', testPassword)

      await page.click('button[type="submit"]')

      await expect(page.locator('text=User already exists')).toBeVisible()
    })

    test('should validate password length', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)

      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', '1234567')

      const submitButton = page.locator('button[type="submit"]')
      await submitButton.click()

      const passwordInput = page.locator('input[name="password"]')
      const validationMessage = await passwordInput.evaluate((el: HTMLInputElement) => el.validationMessage)

      expect(validationMessage).toContain('8 characters')
    })

    test('should navigate to sign in page', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)

      await page.click('a[href="/auth/signin"]')

      await expect(page).toHaveURL(/.*auth\/signin/)
      await expect(page.locator('text=Sign in to your account')).toBeVisible()
    })
  })

  test.describe('Login Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')

      await page.click('button:has-text("Sign out")')
      await page.waitForURL('**/')
    })

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`)

      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)

      await page.click('button[type="submit"]')

      await page.waitForURL('**/dashboard', { timeout: 10000 })

      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('text=' + testEmail)).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`)

      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', 'wrongpassword')

      await page.click('button[type="submit"]')

      await expect(page.locator('text=Invalid email or password')).toBeVisible()
    })

    test('should navigate to register page', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`)

      await page.click('a[href="/auth/register"]')

      await expect(page).toHaveURL(/.*auth\/register/)
      await expect(page.locator('text=Create an account')).toBeVisible()
    })

    test('should navigate to forgot password page', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/signin`)

      await page.click('a[href="/auth/forgot-password"]')

      await expect(page).toHaveURL(/.*auth\/forgot-password/)
      await expect(page.locator('text=Reset your password')).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect to signin when accessing protected route without auth', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`)

      await expect(page).toHaveURL(/.*auth\/signin/)
    })

    test('should redirect to signin when accessing profile without auth', async ({ page }) => {
      await page.goto(`${BASE_URL}/profile`)

      await expect(page).toHaveURL(/.*auth\/signin/)
    })

    test('should access dashboard after login', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')

      await page.waitForURL('**/dashboard')

      await expect(page).toHaveURL(/.*dashboard/)
      await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible()
    })
  })

  test.describe('Logout Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')
    })

    test('should successfully logout', async ({ page }) => {
      await page.click('button:has-text("Sign out")')

      await page.waitForURL('**/')

      await page.goto(`${BASE_URL}/dashboard`)
      await expect(page).toHaveURL(/.*auth\/signin/)
    })
  })

  test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')
    })

    test('should access profile page', async ({ page }) => {
      await page.goto(`${BASE_URL}/profile`)

      await expect(page.locator('h1:has-text("Profile Settings")')).toBeVisible()
      await expect(page.locator(`input[value="${testName}"]`)).toBeVisible()
      await expect(page.locator(`input[value="${testEmail}"]`)).toBeVisible()
    })

    test('should update profile name', async ({ page }) => {
      await page.goto(`${BASE_URL}/profile`)

      const newName = faker.person.fullName()
      await page.fill('input[id="name"]', newName)

      await page.click('button:has-text("Update Profile")')

      await expect(page.locator('text=Profile updated successfully')).toBeVisible()
      await expect(page.locator(`input[value="${newName}"]`)).toBeVisible()
    })

    test('should update password', async ({ page }) => {
      await page.goto(`${BASE_URL}/profile`)

      const newPassword = faker.internet.password({ length: 10 })

      await page.fill('input[id="currentPassword"]', testPassword)
      await page.fill('input[id="newPassword"]', newPassword)

      await page.click('button:has-text("Update Profile")')

      await expect(page.locator('text=Profile updated successfully')).toBeVisible()

      await page.click('button:has-text("Sign out")')
      await page.waitForURL('**/')

      await page.goto(`${BASE_URL}/auth/signin`)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', newPassword)
      await page.click('button[type="submit"]')

      await page.waitForURL('**/dashboard')
      await expect(page).toHaveURL(/.*dashboard/)
    })
  })

  test.describe('Password Reset Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')

      await page.click('button:has-text("Sign out")')
      await page.waitForURL('**/')
    })

    test('should request password reset', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/forgot-password`)

      await page.fill('input[name="email"]', testEmail)
      await page.click('button:has-text("Send reset link")')

      await expect(page.locator('text=Check your email')).toBeVisible()
      await expect(page.locator('text=password reset link')).toBeVisible()
    })

    test('should show generic message for non-existent email', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/forgot-password`)

      await page.fill('input[name="email"]', 'nonexistent@example.com')
      await page.click('button:has-text("Send reset link")')

      await expect(page.locator('text=Check your email')).toBeVisible()
      await expect(page.locator('text=password reset link')).toBeVisible()
    })
  })

  test.describe('Admin Role Access', () => {
    test('should redirect non-admin users from admin routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth/register`)
      await page.fill('input[name="name"]', testName)
      await page.fill('input[name="email"]', testEmail)
      await page.fill('input[name="password"]', testPassword)
      await page.click('button[type="submit"]')
      await page.waitForURL('**/dashboard')

      await page.goto(`${BASE_URL}/admin`)

      await expect(page).toHaveURL(/.*dashboard/)
    })
  })
})