import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'
import dotenv from 'dotenv'

dotenv.config()

const SEED_PHRASE = process.env.SEED_PHRASE!
const PASSWORD = process.env.WALLET_PASSWORD!

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)
  await metamask.importWallet(SEED_PHRASE)

  // MetaMask 13: importWallet không click Done — phải click thủ công để hoàn tất onboarding
  await walletPage.getByTestId('onboarding-complete-done').click({ timeout: 10_000 }).catch(() => {})

  await walletPage.waitForURL(/home\.html(?!.*onboarding)/, { timeout: 15_000 }).catch(() => {})

  // Cache phải lưu ở trạng thái LOCKED — unlockForFixture mới hoạt động đúng khi test chạy
  await walletPage.evaluate(() =>
    (window as any).chrome?.runtime?.sendMessage({ method: 'metamask:lockApp' })
  ).catch(() => {})

  const extensionUrl = walletPage.url().split('/home.html')[0]
  await walletPage.goto(`${extensionUrl}/home.html?lockApp=true`).catch(() => {})
  await walletPage.getByTestId('unlock-password').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
})
