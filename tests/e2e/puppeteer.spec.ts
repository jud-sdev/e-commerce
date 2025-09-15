import { test, expect } from '@playwright/test'
import { puppeteerManager } from '@/lib/puppeteer'

test.describe('Puppeteer Integration', () => {
  test.afterAll(async () => {
    await puppeteerManager.closeBrowser()
  })

  test('should take a screenshot of the home page', async () => {
    const screenshot = await puppeteerManager.screenshot('http://localhost:3000', {
      fullPage: true,
    })

    expect(screenshot).toBeDefined()
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('should extract page title', async () => {
    const data = await puppeteerManager.extractData('http://localhost:3000', {
      title: 'title',
      heading: 'h1',
    })

    expect(data.title).toBeDefined()
    expect(data.heading).toBeDefined()
  })

  test('should perform user interactions', async () => {
    const screenshots = await puppeteerManager.performActions('http://localhost:3000', [
      { type: 'wait', delay: 1000 },
      { type: 'screenshot' },
    ])

    expect(screenshots).toHaveLength(1)
    expect(screenshots[0]).toBeDefined()
  })
})