import type { Page } from '@playwright/test'

export class BasePage {
  protected page: Page

  constructor(page: Page) {
    this.page = page
  }

  async navigate(path = '') {
    await this.page.goto(path)
  }

  async clickByRole(role: Parameters<Page['getByRole']>[0], name: string) {
    await this.page.getByRole(role, { name }).click()
  }
}
