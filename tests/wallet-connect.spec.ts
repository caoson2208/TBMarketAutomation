import { test, expect } from '../src/fixtures/web3.fixture'
import { DAppPage } from '../src/pages/dapp.page'
import { approveMetaMaskConnection, approveMetaMaskSignIn } from '../src/utils/metamask.helpers'
import type { BrowserContext } from '@playwright/test'

test.describe('Wallet Connection', () => {
  test('should connect MetaMask wallet to dApp', async ({ context, page }) => {
    const dapp = new DAppPage(page)
    const ctx = context as unknown as BrowserContext

    await dapp.openWalletModal()

    const connectionApproved = approveMetaMaskConnection(ctx)
    await dapp.selectMetaMask()
    await connectionApproved

    await approveMetaMaskSignIn(ctx)

    await expect(dapp.connectWalletBtn).not.toBeVisible()
  })
})
