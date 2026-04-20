/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARC_TESTNET_RPC: string
  readonly VITE_ARC_TESTNET_CHAIN_ID: string
  readonly VITE_ARC_TESTNET_USDC: string
  readonly VITE_CIRCLE_API_KEY: string
  readonly VITE_CIRCLE_ENTITY_SECRET: string
  readonly VITE_KIT_KEY: string
  readonly VITE_WALLET_CONNECT_PROJECT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
