import { useWallet } from '../contexts/WalletContext'
import { Wallet, LogOut, Coins, Network } from 'lucide-react'
import './WalletConnect.css'

function WalletConnect() {
  const { isConnected, address, balance, connect, disconnect } = useWallet()

  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  return (
    <div className="wallet-connect">
      {!isConnected ? (
        <button 
          className="btn-primary bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-2.5 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
          onClick={connect}
        >
          <Wallet className="w-4 h-4" />
          Connect Wallet
        </button>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Wallet className="w-3 h-3" />
              Address:
            </span>
            <span className="font-mono font-medium">{formatAddress(address)}</span>
          </div>
          <div className="flex flex-col items-end text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Coins className="w-3 h-3" />
              Balance:
            </span>
            <span className="font-medium">{balance} USDC</span>
          </div>
          <div className="flex flex-col items-end text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Network className="w-3 h-3" />
              Network:
            </span>
            <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">Arc Testnet</span>
          </div>
          <button 
            className="btn-secondary bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            onClick={disconnect}
          >
            <LogOut className="w-4 h-4" />
            Disconnect
          </button>
        </div>
      )}
    </div>
  )
}

export default WalletConnect
