import puppeteer, { Browser, Page } from 'puppeteer'

export class PuppeteerManager {
  private browser: Browser | null = null

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === 'production',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      })
    }
    return this.browser
  }

  async createPage(): Promise<Page> {
    const browser = await this.getBrowser()
    const page = await browser.newPage()

    // Set viewport for consistent screenshots
    await page.setViewport({ width: 1920, height: 1080 })

    // Set user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    )

    return page
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  async screenshot(url: string, options?: {
    selector?: string
    fullPage?: boolean
    filename?: string
  }): Promise<Buffer> {
    const page = await this.createPage()

    try {
      await page.goto(url, { waitUntil: 'networkidle2' })

      if (options?.selector) {
        await page.waitForSelector(options.selector)
        const element = await page.$(options.selector)
        if (element) {
          return await element.screenshot() as Buffer
        }
      }

      return await page.screenshot({
        fullPage: options?.fullPage ?? false,
      }) as Buffer
    } finally {
      await page.close()
    }
  }

  async extractData(url: string, extractors: Record<string, string>): Promise<Record<string, string>> {
    const page = await this.createPage()
    const results: Record<string, string> = {}

    try {
      await page.goto(url, { waitUntil: 'networkidle2' })

      for (const [key, selector] of Object.entries(extractors)) {
        try {
          const element = await page.$(selector)
          if (element) {
            results[key] = await page.evaluate(el => el.textContent?.trim() || '', element)
          }
        } catch (error) {
          console.error(`Error extracting ${key}:`, error)
          results[key] = ''
        }
      }

      return results
    } finally {
      await page.close()
    }
  }

  async performActions(url: string, actions: Array<{
    type: 'click' | 'type' | 'wait' | 'screenshot'
    selector?: string
    text?: string
    delay?: number
    filename?: string
  }>): Promise<Buffer[]> {
    const page = await this.createPage()
    const screenshots: Buffer[] = []

    try {
      await page.goto(url, { waitUntil: 'networkidle2' })

      for (const action of actions) {
        switch (action.type) {
          case 'click':
            if (action.selector) {
              await page.click(action.selector)
              if (action.delay) await new Promise(resolve => setTimeout(resolve, action.delay))
            }
            break

          case 'type':
            if (action.selector && action.text) {
              await page.type(action.selector, action.text)
              if (action.delay) await new Promise(resolve => setTimeout(resolve, action.delay))
            }
            break

          case 'wait':
            if (action.selector) {
              await page.waitForSelector(action.selector)
            } else if (action.delay) {
              await new Promise(resolve => setTimeout(resolve, action.delay))
            }
            break

          case 'screenshot':
            const screenshot = await page.screenshot() as Buffer
            screenshots.push(screenshot)
            break
        }
      }

      return screenshots
    } finally {
      await page.close()
    }
  }
}

export const puppeteerManager = new PuppeteerManager()

// Cleanup on process exit
process.on('beforeExit', async () => {
  await puppeteerManager.closeBrowser()
})