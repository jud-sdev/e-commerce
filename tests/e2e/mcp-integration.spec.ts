import { test, expect } from '@playwright/test'
import { mcpPuppeteer } from '@/lib/mcp-puppeteer'

test.describe('MCP Puppeteer Integration', () => {
  test.afterAll(async () => {
    await mcpPuppeteer.cleanup()
  })

  test('should capture homepage screenshot', async () => {
    const screenshot = await mcpPuppeteer.navigateAndCapture('/')
    expect(screenshot).toBeDefined()
    expect(screenshot.length).toBeGreaterThan(0)
  })

  test('should extract page data', async () => {
    const data = await mcpPuppeteer.extractPageData('/', {
      title: 'title',
      heading: 'h1',
    })

    expect(data).toBeDefined()
    expect(data.title).toBeDefined()
  })

  test('should test responsiveness', async () => {
    const screenshots = await mcpPuppeteer.testResponsiveness('/')

    expect(screenshots.mobile).toBeDefined()
    expect(screenshots.tablet).toBeDefined()
    expect(screenshots.desktop).toBeDefined()
  })

  test('should validate basic accessibility', async () => {
    const accessibility = await mcpPuppeteer.validateAccessibility('/')

    expect(accessibility).toBeDefined()
    expect(typeof accessibility.imagesWithoutAlt).toBe('number')
    expect(typeof accessibility.hasH1).toBe('boolean')
    expect(typeof accessibility.hasMainLandmark).toBe('boolean')
  })

  test('should perform user flow', async () => {
    const screenshots = await mcpPuppeteer.performUserFlow('/', [
      { type: 'wait', delay: 1000 },
      { type: 'screenshot' },
    ])

    expect(screenshots).toHaveLength(1)
    expect(screenshots[0]).toBeDefined()
  })
})