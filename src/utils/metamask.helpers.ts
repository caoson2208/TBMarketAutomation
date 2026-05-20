import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'

async function waitForNotificationPage(context: BrowserContext, timeoutMs = 15_000): Promise<Page> {
  return new Promise<Page>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('MetaMask notification page did not open after 15s')),
      timeoutMs
    )
    context.on('page', (newPage: Page) => {
      if (newPage.url().includes('notification.html')) {
        clearTimeout(timeout)
        resolve(newPage)
      }
    })
  })
}

export async function approveMetaMaskConnection(context: BrowserContext): Promise<void> {
  const notificationPage = await waitForNotificationPage(context)

  const connectBtn = notificationPage.getByRole('button', { name: /^connect$/i })
  await expect(connectBtn).toBeVisible()
  await expect(connectBtn).toBeEnabled()
  await connectBtn.click()
}

export async function approveMetaMaskSignIn(context: BrowserContext): Promise<void> {
  // Sign-in request có thể xuất hiện trên cùng trang notification cũ hoặc trang mới
  const existingPage = context.pages().find(p => p.url().includes('notification.html'))
  const notificationPage = existingPage ?? await waitForNotificationPage(context)

  const confirmBtn = notificationPage.getByRole('button', { name: /^confirm$/i })
  await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
  await expect(confirmBtn).toBeEnabled()
  await confirmBtn.click()
}
