import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { createPublicClient, createWalletClient, http, custom, formatUnits, parseUnits } from 'viem'

interface WalletState {
  isConnected: boolean
  address: string
  balance: string
  chainId: number
  walletClient: any
  publicClient: any
  connect: () => Promise<void>
  disconnect: () => void
  sendTransaction: (to: string, amount: string) => Promise<void>
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletState | undefined>(undefined)

// Arc Testnet Configuration (from https://docs.arc.network/arc/references/connect-to-arc)
const ARC_TESTNET_CHAIN_ID = 5042002
const ARC_TESTNET_RPC = (import.meta as any).env.VITE_ARC_TESTNET_RPC || 'https://rpc.testnet.arc.network'
const USDC_ADDRESS = (import.meta as any).env.VITE_ARC_TESTNET_USDC || '0x3600000000000000000000000000000000000000'

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState('0')
  const [chainId, setChainId] = useState(ARC_TESTNET_CHAIN_ID)
  const [walletClient, setWalletClient] = useState<any>(null)
  const [publicClient, setPublicClient] = useState<any>(null)

  // Function to get USDC balance
  const getBalance = async (addr: string) => {
    if (!publicClient) return '0'
    
    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: [
          {
            constant: true,
            inputs: [{ name: '_owner', type: 'address' }],
            name: 'balanceOf',
            outputs: [{ name: 'balance', type: 'uint256' }],
            type: 'function',
          },
        ],
        functionName: 'balanceOf',
        args: [addr as `0x${string}`],
      })
      return formatUnits(balance as bigint, 6)
    } catch (error) {
      console.error('Failed to get USDC balance:', error)
      return '0'
    }
  }

  // Initialize public client for reading blockchain data
  useEffect(() => {
    const client = createPublicClient({
      chain: {
        id: ARC_TESTNET_CHAIN_ID,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: {
          public: { http: [ARC_TESTNET_RPC] },
          default: { http: [ARC_TESTNET_RPC] },
        },
      },
      transport: http(),
    })
    setPublicClient(client)
  }, [])

  // Refresh balance function
  const refreshBalance = async () => {
    if (address && isConnected) {
      const newBalance = await getBalance(address)
      setBalance(newBalance)
    }
  }

  const disconnect = () => {
    setAddress('')
    setBalance('0')
    setIsConnected(false)
    setWalletClient(null)
  }

  // Handle account changes
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ethereum && typeof (window as any).ethereum.on === 'function') {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected wallet
          disconnect()
        } else if (accounts[0] !== address) {
          // User switched accounts
          setAddress(accounts[0])
          const newBalance = await getBalance(accounts[0])
          setBalance(newBalance)
        }
      }

      const handleChainChanged = (chainId: string) => {
        const newChainId = parseInt(chainId, 16)
        setChainId(newChainId)
        
        if (newChainId !== ARC_TESTNET_CHAIN_ID) {
          // User switched to wrong network
          alert('Please switch to Arc Testnet')
        } else {
          // Refresh balance when switching back to correct network
          refreshBalance()
        }
      }

      try {
        (window as any).ethereum.on('accountsChanged', handleAccountsChanged)
        (window as any).ethereum.on('chainChanged', handleChainChanged)

        return () => {
          try {
            (window as any).ethereum?.removeListener('accountsChanged', handleAccountsChanged)
            (window as any).ethereum?.removeListener('chainChanged', handleChainChanged)
          } catch (error) {
            console.error('Error removing event listeners:', error)
          }
        }
      } catch (error) {
        console.error('Error setting up event listeners:', error)
      }
    }
  }, [address, isConnected])

  const connect = async () => {
    try {
      // Check if MetaMask or other wallet is available
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const accounts = await (window as any).ethereum.request({
          method: 'eth_requestAccounts',
        })

        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)

          // Create wallet client
          const client = createWalletClient({
            chain: {
              id: ARC_TESTNET_CHAIN_ID,
              name: 'Arc Testnet',
              nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              rpcUrls: {
                public: { http: [ARC_TESTNET_RPC] },
                default: { http: [ARC_TESTNET_RPC] },
              },
            },
            transport: custom((window as any).ethereum),
          })
          setWalletClient(client)

          // Request to switch to Arc testnet
          try {
            await (window as any).ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}` }],
            })
          } catch (switchError: any) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
              try {
                await (window as any).ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: `0x${ARC_TESTNET_CHAIN_ID.toString(16)}`,
                      chainName: 'Arc Testnet',
                      nativeCurrency: {
                        name: 'ETH',
                        symbol: 'ETH',
                        decimals: 18,
                      },
                      rpcUrls: [ARC_TESTNET_RPC],
                      blockExplorerUrls: ['https://explorer.testnet.arc.network'],
                    },
                  ],
                })
              } catch (addError) {
                console.error('Failed to add Arc testnet to wallet:', addError)
              }
            }
          }

          // Get USDC balance
          const initialBalance = await getBalance(accounts[0])
          setBalance(initialBalance)

          console.log('Wallet connected to Arc testnet:', accounts[0])
        }
      } else {
        alert('Please install MetaMask or another Web3 wallet to connect')
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      throw error
    }
  }

  const sendTransaction = async (to: string, amount: string) => {
    if (!walletClient || !publicClient) {
      throw new Error('Wallet not connected')
    }

    try {
      const amountBigInt = parseUnits(amount, 6)

      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: [
          {
            constant: false,
            inputs: [
              { name: '_to', type: 'address' },
              { name: '_value', type: 'uint256' },
            ],
            name: 'transfer',
            outputs: [{ name: '', type: 'bool' }],
            type: 'function',
          },
        ],
        functionName: 'transfer',
        args: [to as `0x${string}`, amountBigInt],
      })

      // Refresh balance after transaction
      await refreshBalance()
      
      console.log('Transaction sent:', hash)
      return hash
    } catch (error) {
      console.error('Failed to send transaction:', error)
      throw error
    }
  }

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        balance,
        chainId,
        walletClient,
        publicClient,
        connect,
        disconnect,
        sendTransaction,
        refreshBalance,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
