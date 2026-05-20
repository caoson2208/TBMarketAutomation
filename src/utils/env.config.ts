import dotenv from 'dotenv'
dotenv.config()

export const config = {
  baseUrl: process.env.BASE_URL!,
  walletPassword: process.env.WALLET_PASSWORD!,
}
