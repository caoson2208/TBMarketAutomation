import { BasePage } from './base.page'

export class DAppPage extends BasePage {
  readonly connectWalletBtn = this.page.getByRole('button', { name: /connect wallet/i })
  readonly connectMetaMaskBtn = this.page.getByRole('button', { name: /connect with metamask/i })

  async openWalletModal() {
    await this.connectWalletBtn.click()
  }

  async selectMetaMask() {
    await this.connectMetaMaskBtn.click()
  }
}
