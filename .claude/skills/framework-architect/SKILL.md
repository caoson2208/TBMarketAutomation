---
name: framework-architect
description: 
  Thiết kế và scaffold automation framework Playwright + Synpress (Web3 dApp) — bao gồm project
  structure, Page Object Model, base classes, MetaMask wallet setup, fixtures, helpers, reporting,
  và CI/CD. Dùng skill này BẤT CỨ KHI NÀO user hỏi về tạo project mới, scaffold cấu trúc thư mục,
  chuẩn hóa framework, thiết lập Synpress/MetaMask, hoặc thêm page/fixture/helper mới. Kể cả khi
  user nói "tạo test mới", "viết page object" — nếu chưa có structure phù hợp, scaffold trước.
---

# Framework Architect

## Nhiệm Vụ

Thiết kế, scaffold, và chuẩn hóa automation framework. Agent đọc rules trong `.claude/rules/` trước
khi generate bất kỳ file nào.

Khả năng:
- Scaffold project structure theo best practices
- Sinh base classes, Page Object Model, fixtures, helpers
- Cấu hình Playwright + Synpress cho Web3 dApp testing
- Tích hợp reporting (HTML Report, Allure)
- Cấu hình CI/CD pipeline (GitHub Actions)
- Tạo wallet-setup cho MetaMask + Synpress

---

## Supported Stack

**Playwright + Synpress (Web3 dApp)** — TypeScript · Playwright Test · HTML Report

---

## Project Structure Template

### Playwright + Synpress (Web3 dApp)

```
project-root/
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env                          # SEED_PHRASE, WALLET_PASSWORD, BASE_URL — KHÔNG commit
├── .env.example                  # Template an toàn để commit
├── .gitignore
├── wallet-setup/
│   └── basic.setup.ts            # defineWalletSetup — cache wallet state
├── src/
│   ├── pages/
│   │   ├── base.page.ts          # Common methods
│   │   └── dapp.page.ts          # dApp UI: locators + actions
│   ├── fixtures/
│   │   └── web3.fixture.ts       # metaMaskFixtures + testWithSynpress
│   └── utils/
│       ├── env.config.ts         # Typed config từ .env
│       └── metamask.helpers.ts   # approveMetaMaskConnection, v.v.
└── tests/
    ├── wallet-connect.spec.ts
    └── <feature>/
        └── <feature>.spec.ts     # Thêm test mới theo module
```

---

## Framework Components

### 1. Configuration Management (Bắt buộc)
- Đọc từ `.env` qua `dotenv` — không hardcode URL, credentials
- `env.config.ts` export typed config object
- `.env` thêm vào `.gitignore`

```typescript
// src/utils/env.config.ts
import dotenv from 'dotenv'
dotenv.config()

export const config = {
  baseUrl: process.env.BASE_URL!,
  walletPassword: process.env.WALLET_PASSWORD!,
  seedPhrase: process.env.SEED_PHRASE!,
}
```

### 2. Base Page (Bắt buộc)
- Common methods: navigate, clickByRole
- Không chứa assertion — assertion chỉ ở test
- Không dùng `waitForTimeout` — dùng web-first assertions

```typescript
// src/pages/base.page.ts
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
```

### 3. Page Object Model (Bắt buộc)
- 1 page = 1 class, extends BasePage
- Locators khai báo `readonly` ở đầu class — không inline trong test
- Methods mô tả hành vi người dùng

```typescript
// src/pages/dapp.page.ts
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
```

### 4. Synpress Wallet Setup (Bắt buộc cho Web3)
- `wallet-setup/basic.setup.ts` dùng `defineWalletSetup`
- MetaMask 13: phải click `onboarding-complete-done` sau `importWallet`
- Cache phải ở trạng thái **LOCKED** — `unlockForFixture` mới hoạt động
- Rebuild cache khi thay đổi file setup: `npm run wallet:setup`

```typescript
// wallet-setup/basic.setup.ts
import { defineWalletSetup } from '@synthetixio/synpress'
import { MetaMask } from '@synthetixio/synpress/playwright'
import dotenv from 'dotenv'
dotenv.config()

const SEED_PHRASE = process.env.SEED_PHRASE!
const PASSWORD = process.env.WALLET_PASSWORD!

export default defineWalletSetup(PASSWORD, async (context, walletPage) => {
  const metamask = new MetaMask(context, walletPage, PASSWORD)
  await metamask.importWallet(SEED_PHRASE)

  // MetaMask 13: click Done để hoàn tất onboarding
  await walletPage.getByTestId('onboarding-complete-done').click({ timeout: 10_000 }).catch(() => {})

  // Chờ home page load
  await walletPage.waitForURL(/home\.html(?!.*onboarding)/, { timeout: 15_000 }).catch(() => {})

  // Lock wallet — cache phải ở trạng thái LOCKED cho unlockForFixture
  await walletPage.evaluate(() =>
    (window as any).chrome?.runtime?.sendMessage({ method: 'metamask:lockApp' })
  ).catch(() => {})
  const extensionUrl = walletPage.url().split('/home.html')[0]
  await walletPage.goto(`${extensionUrl}/home.html?lockApp=true`).catch(() => {})
  await walletPage.getByTestId('unlock-password').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
})
```

### 5. MetaMask Helpers (Bắt buộc cho Web3)
- Synpress v4 dùng selector cũ — MetaMask 13 có UI mới (1 bước Connect, không còn Next+Connect)
- Dùng custom `approveMetaMaskConnection()` thay vì `metamask.connectToDapp()`

```typescript
// src/utils/metamask.helpers.ts
import type { BrowserContext, Page } from '@playwright/test'
import { expect } from '@playwright/test'

export async function approveMetaMaskConnection(context: BrowserContext): Promise<void> {
  const notificationPage = await new Promise<Page>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('MetaMask notification page did not open after 15s')),
      15_000
    )
    context.on('page', (newPage: Page) => {
      if (newPage.url().includes('notification.html')) {
        clearTimeout(timeout)
        resolve(newPage)
      }
    })
  })

  const connectBtn = notificationPage.getByRole('button', { name: /^connect$/i })
  await expect(connectBtn).toBeVisible()
  await expect(connectBtn).toBeEnabled()
  await connectBtn.click()
  await notificationPage.waitForEvent('close', { timeout: 10_000 }).catch(() => {})
}
```

### 6. Fixtures (Bắt buộc)
- Wrap `testWithSynpress(metaMaskFixtures(basicSetup))` thành custom `test` object
- Import `test` và `expect` từ fixture này trong mọi spec file

```typescript
// src/fixtures/web3.fixture.ts
import { testWithSynpress } from '@synthetixio/synpress'
import { metaMaskFixtures } from '@synthetixio/synpress/playwright'
import basicSetup from '../../wallet-setup/basic.setup'

export const test = testWithSynpress(metaMaskFixtures(basicSetup))
export const { expect } = test
```

### 7. Test Structure (Bắt buộc)
- Import `test` và `expect` từ `src/fixtures/web3.fixture`
- Dùng `test.describe` để nhóm theo feature
- Đăng ký listener MetaMask TRƯỚC khi click trigger
- Assertion rõ ràng ở cuối mỗi test

```typescript
// tests/wallet-connect.spec.ts
import { test, expect } from '../src/fixtures/web3.fixture'
import { DAppPage } from '../src/pages/dapp.page'
import { approveMetaMaskConnection } from '../src/utils/metamask.helpers'
import type { BrowserContext } from '@playwright/test'

test.describe('Wallet Connection', () => {
  test('should connect MetaMask wallet to dApp', async ({ context, page }) => {
    const dapp = new DAppPage(page)
    await dapp.openWalletModal()

    // Đăng ký listener TRƯỚC khi click để không miss notification page event
    const connectionApproved = approveMetaMaskConnection(context as unknown as BrowserContext)
    await dapp.selectMetaMask()
    await connectionApproved

    await expect(dapp.connectWalletBtn).not.toBeVisible()
  })
})
```

### 8. Reporting (Bắt buộc)
- HTML Report mặc định của Playwright
- Screenshot + video khi fail — cấu hình qua `playwright.config.ts`

```typescript
// playwright.config.ts (phần use)
use: {
  baseURL: process.env.BASE_URL,
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  headless: false,  // headed khi debug, true trong CI
}
```

---

## npm Scripts

```json
{
  "scripts": {
    "wallet:setup": "synpress wallet-setup",
    "test": "playwright test",
    "test:ui": "playwright test --ui",
    "test:headed": "playwright test --headed",
    "report": "playwright show-report"
  }
}
```

> Khi thay đổi `wallet-setup/basic.setup.ts`, phải chạy `npm run wallet:setup` trước `npm test`.

---

## CI/CD Template (GitHub Actions)

```yaml
# .github/workflows/playwright.yml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install chromium
      - run: npm run wallet:setup
        env:
          SEED_PHRASE: ${{ secrets.SEED_PHRASE }}
          WALLET_PASSWORD: ${{ secrets.WALLET_PASSWORD }}
          BASE_URL: ${{ vars.BASE_URL }}
      - run: npm test
        env:
          BASE_URL: ${{ vars.BASE_URL }}
          SEED_PHRASE: ${{ secrets.SEED_PHRASE }}
          WALLET_PASSWORD: ${{ secrets.WALLET_PASSWORD }}
          CI: true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Design Principles

1. **DRY** — Logic lặp lại → helper method hoặc Page class, không copy-paste
2. **Single Responsibility** — Page: UI interaction. Test: assertion. Utils: reusable logic
3. **Configuration over Code** — URL, credentials, timeout → .env và playwright.config.ts
4. **Fail Fast, Log Rich** — Screenshot on failure, web-first assertions với message rõ ràng
5. **Test Independence** — Mỗi test tự setup/teardown, không share state

---

## Anti-Patterns (FORBIDDEN)

| ❌ Sai | ✅ Đúng |
|---|---|
| Hardcode URL/credentials trong code | Đọc từ `.env` qua `env.config.ts` |
| Locator inline trong test | Khai báo `readonly` trong Page class |
| `waitForTimeout()` / `setTimeout()` | Web-first assertions (`expect().toBeVisible()`) |
| `metamask.connectToDapp()` với MetaMask 13 | Custom `approveMetaMaskConnection()` |
| Cache chưa rebuild sau khi sửa setup | Chạy `npm run wallet:setup` trước `npm test` |
| Locator bằng CSS class hash | `getByRole`, `getByTestId`, semantic locators |
| Helper/logic viết thẳng trong test spec | Tách ra `src/utils/` hoặc `src/pages/` |
| `pages/` và `utils/` ở root level | Đặt trong `src/pages/` và `src/utils/` |

---

## Rules References

Trước khi generate code, đọc và tuân thủ:
- `.claude/rules/automation_rules.md` — General automation best practices, naming, data management
- `.claude/rules/locator_strategy.md` — Locator priority map
- `.claude/rules/playwright_rules.md` — Playwright-specific: wait strategy, test structure, locator priority
