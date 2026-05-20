# TBMarket Automation

Web3 dApp automation framework sử dụng Playwright + Synpress + MetaMask.

**Target:** [https://qa-web.tbmarket.cc](https://qa-web.tbmarket.cc)

---

## Yêu Cầu Hệ Thống

- [Node.js](https://nodejs.org) >= 18
- npm >= 9
- Google Chrome (để chạy headed mode)

---

## Cài Đặt Sau Khi Clone

### 1. Clone repository

```bash
git clone <repository-url>
cd TBMarketAutomation
```

### 2. Cài dependencies

```bash
npm install
```

### 3. Cài Playwright browsers

```bash
npx playwright install chromium
```

### 4. Tạo file `.env`

Copy file mẫu và điền thông tin thực:

```bash
cp .env.example .env
```

Mở `.env` và cập nhật 3 biến:

| Biến | Mô tả |
|---|---|
| `BASE_URL` | URL môi trường test |
| `SEED_PHRASE` | 12 từ seed phrase của ví MetaMask |
| `WALLET_PASSWORD` | Mật khẩu ví MetaMask |

> File `.env` đã có trong `.gitignore` — không commit lên Git.

### 5. Build wallet cache (bắt buộc trước khi chạy test lần đầu)

```bash
npm run wallet:setup
```

Import ví MetaMask từ seed phrase và lưu cache. Chạy lại khi:
- Clone project về máy mới
- Sửa file `wallet-setup/basic.setup.ts`
- Đổi `SEED_PHRASE` hoặc `WALLET_PASSWORD` trong `.env`

---

## Chạy Test

### Chạy tất cả test (headed)

```bash
npm test
```

### Chạy với Playwright UI (khuyến nghị khi debug)

```bash
npx playwright test --ui
```

### Chạy headed mode (browser hiển thị)

```bash
npm run test:headed
```

### Chạy debug mode (step-by-step)

```bash
npm run test:debug
```

### Chạy một file test cụ thể

```bash
npx playwright test tests/wallet-connect.spec.ts
```

### Xem report sau khi chạy

```bash
npm run report
```

---

## Cấu Trúc Project

```
TBMarketAutomation/
├── wallet-setup/
│   └── basic.setup.ts        # Cấu hình import ví MetaMask
├── src/
│   ├── pages/
│   │   ├── base.page.ts      # Base class chứa common methods
│   │   └── dapp.page.ts      # Page Object cho dApp UI
│   ├── fixtures/
│   │   └── web3.fixture.ts   # Synpress + MetaMask fixtures
│   └── utils/
│       ├── env.config.ts     # Đọc config từ .env
│       └── metamask.helpers.ts  # Helper xử lý MetaMask popup
├── tests/
│   └── wallet-connect.spec.ts
├── playwright.config.ts
├── .env                      # Credentials (KHÔNG commit)
└── .env.example              # Template để commit
```

---

## Thêm Test Mới

1. Tạo Page Object trong `src/pages/<tên>.page.ts`
2. Tạo spec file trong `tests/<feature>/<tên>.spec.ts`
3. Import `test` và `expect` từ `src/fixtures/web3.fixture.ts`

```typescript
import { test, expect } from '../src/fixtures/web3.fixture'
import { DAppPage } from '../src/pages/dapp.page'

test.describe('<Feature Name>', () => {
  test('<mô tả hành vi>', async ({ context, page }) => {
    // ...
  })
})
```

---

## Lưu Ý Quan Trọng

| Tình huống | Hành động |
|---|---|
| Lỗi `Cache does not exist` | Chạy `npm run wallet:setup` |
| Đổi seed phrase hoặc password | Chạy lại `npm run wallet:setup` |
| Test chạy chậm / timeout | Kiểm tra kết nối mạng đến `qa-web.tbmarket.cc` |
| MetaMask popup không xuất hiện | Đảm bảo đã build wallet cache thành công |
