import { puppeteerManager } from './puppeteer'

export interface MCPPuppeteerConfig {
  baseUrl?: string
  headless?: boolean
  timeout?: number
}

export class MCPPuppeteerIntegration {
  private config: MCPPuppeteerConfig

  constructor(config: MCPPuppeteerConfig = {}) {
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      headless: process.env.PUPPETEER_HEADLESS === 'true',
      timeout: parseInt(process.env.PUPPETEER_TIMEOUT || '30000'),
      ...config,
    }
  }

  async navigateAndCapture(path: string, options?: {
    selector?: string
    fullPage?: boolean
    waitForSelector?: string
  }) {
    const url = `${this.config.baseUrl}${path}`

    if (options?.waitForSelector) {
      const page = await puppeteerManager.createPage()
      try {
        await page.goto(url, { waitUntil: 'networkidle2' })
        await page.waitForSelector(options.waitForSelector, {
          timeout: this.config.timeout
        })

        return await puppeteerManager.screenshot(url, {
          selector: options.selector,
          fullPage: options.fullPage,
        })
      } finally {
        await page.close()
      }
    }

    return await puppeteerManager.screenshot(url, {
      selector: options?.selector,
      fullPage: options?.fullPage,
    })
  }

  async extractPageData(path: string, selectors: Record<string, string>) {
    const url = `${this.config.baseUrl}${path}`
    return await puppeteerManager.extractData(url, selectors)
  }

  async performUserFlow(path: string, actions: Array<{
    type: 'click' | 'type' | 'wait' | 'screenshot'
    selector?: string
    text?: string
    delay?: number
  }>) {
    const url = `${this.config.baseUrl}${path}`
    return await puppeteerManager.performActions(url, actions)
  }

  async testResponsiveness(path: string, viewports: Array<{
    width: number
    height: number
    name: string
  }> = [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1920, height: 1080, name: 'desktop' },
  ]) {
    const url = `${this.config.baseUrl}${path}`
    const screenshots: Record<string, Buffer> = {}

    const page = await puppeteerManager.createPage()
    try {
      await page.goto(url, { waitUntil: 'networkidle2' })

      for (const viewport of viewports) {
        await page.setViewport(viewport)
        await new Promise(resolve => setTimeout(resolve, 500)) // Allow layout to settle
        screenshots[viewport.name] = await page.screenshot() as Buffer
      }

      return screenshots
    } finally {
      await page.close()
    }
  }

  async validateAccessibility(path: string) {
    const url = `${this.config.baseUrl}${path}`
    const page = await puppeteerManager.createPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle2' })

      // Basic accessibility checks
      const accessibilityData = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))
        const imagesWithoutAlt = images.filter(img => !img.alt)

        const buttons = Array.from(document.querySelectorAll('button'))
        const buttonsWithoutText = buttons.filter(btn =>
          !btn.textContent?.trim() && !btn.getAttribute('aria-label')
        )

        const inputs = Array.from(document.querySelectorAll('input[type!="hidden"]'))
        const inputsWithoutLabels = inputs.filter(input => {
          const id = input.id
          const hasLabel = id && document.querySelector(`label[for="${id}"]`)
          const hasAriaLabel = input.getAttribute('aria-label')
          return !hasLabel && !hasAriaLabel
        })

        return {
          imagesWithoutAlt: imagesWithoutAlt.length,
          buttonsWithoutText: buttonsWithoutText.length,
          inputsWithoutLabels: inputsWithoutLabels.length,
          hasH1: !!document.querySelector('h1'),
          hasMainLandmark: !!document.querySelector('main'),
        }
      })

      return accessibilityData
    } finally {
      await page.close()
    }
  }

  async cleanup() {
    await puppeteerManager.closeBrowser()
  }
}

export const mcpPuppeteer = new MCPPuppeteerIntegration()