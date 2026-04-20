import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import 'hardhat-deploy'
import * as dotenv from 'dotenv'

dotenv.config()

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      evmVersion: 'cancun'
    }
  },
  namedAccounts: {
    deployer: {
      default: 0
    }
  },
  networks: {
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC || 'https://rpc.testnet.arc.network',
      chainId: 5042002,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    ethereumSepolia: {
      url: process.env.ETHEREUM_SEPOLIA_RPC || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      arcTestnet: process.env.ARC_API_KEY || '',
      ethereumSepolia: process.env.ETHERSCAN_API_KEY || ''
    },
    customChains: [
      {
        network: 'arcTestnet',
        chainId: 5042002,
        urls: {
          apiURL: 'https://api-testnet.arc.network/api',
          browserURL: 'https://testnet.arcscan.app'
        }
      }
    ]
  }
}

export default config
