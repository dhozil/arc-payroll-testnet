import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import './ExchangeMenu.css'

interface ExchangeOption {
  id: string
  from: string
  to: string
  rate: number
  icon: string
}

function ExchangeMenu() {
  const { isConnected, balance } = useWallet()
  const [amount, setAmount] = useState('')
  const [selectedOption, setSelectedOption] = useState<string>('usdc-idr')
  const [isProcessing, setIsProcessing] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({})
  const [isLoadingRates, setIsLoadingRates] = useState(true)

  const baseExchangeOptions: Omit<ExchangeOption, 'rate'>[] = [
    { id: 'usdc-idr', from: 'USDC', to: 'IDR', icon: '🇮🇩' },
    { id: 'usdc-eurc', from: 'USDC', to: 'EURC', icon: '🇪🇺' },
    { id: 'usdc-sgd', from: 'USDC', to: 'SGD', icon: '🇸🇬' },
    { id: 'usdc-myr', from: 'USDC', to: 'MYR', icon: '🇲🇾' },
    { id: 'usdc-thb', from: 'USDC', to: 'THB', icon: '🇹🇭' },
  ]

  // Fetch real exchange rates
  useEffect(() => {
    const fetchExchangeRates = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
        const data = await response.json()
        
        setExchangeRates({
          'usdc-idr': data.rates.IDR,
          'usdc-eurc': data.rates.EUR,
          'usdc-sgd': data.rates.SGD,
          'usdc-myr': data.rates.MYR,
          'usdc-thb': data.rates.THB,
        })
      } catch (error) {
        console.error('Failed to fetch exchange rates:', error)
        // Fallback to default rates
        setExchangeRates({
          'usdc-idr': 15800,
          'usdc-eurc': 0.92,
          'usdc-sgd': 1.35,
          'usdc-myr': 4.75,
          'usdc-thb': 36.50,
        })
      } finally {
        setIsLoadingRates(false)
      }
    }

    fetchExchangeRates()
  }, [])

  const exchangeOptions: ExchangeOption[] = baseExchangeOptions.map(opt => ({
    ...opt,
    rate: exchangeRates[opt.id] || 1
  }))

  const selectedExchange = exchangeOptions.find(opt => opt.id === selectedOption)

  const calculateOutput = () => {
    if (!amount || !selectedExchange) return '0'
    const inputAmount = parseFloat(amount)
    if (isNaN(inputAmount)) return '0'
    return (inputAmount * selectedExchange.rate).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const handleExchange = () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsProcessing(true)
    
    // Simulate exchange process
    setTimeout(() => {
      alert(`⚠️ TESTNET: Exchange simulation\n\nConverting ${amount} ${selectedExchange?.from} to ${calculateOutput()} ${selectedExchange?.to}\n\nIn production, this would use Arc App Kit swap functionality.`)
      setIsProcessing(false)
      setAmount('')
    }, 2000)
  }

  return (
    <div className="exchange-menu">
      <div className="exchange-header">
        <h3>💱 Exchange</h3>
        <p className="subtitle">Convert USDC to local currencies</p>
      </div>

      {!isConnected ? (
        <div className="connect-prompt">
          <p>Connect your wallet to exchange currencies</p>
        </div>
      ) : (
        <div className="exchange-content">
          <div className="balance-display">
            <span className="label">Available:</span>
            <span className="value">{balance} USDC</span>
          </div>

          <div className="exchange-form">
            <div className="form-group">
              <label>Amount</label>
              <div className="input-wrapper">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  max={parseFloat(balance)}
                />
                <span className="currency-badge">USDC</span>
              </div>
            </div>

            <div className="form-group">
              <label>Convert To</label>
              <div className="exchange-options">
                {exchangeOptions.map(option => (
                  <button
                    key={option.id}
                    className={`exchange-option ${selectedOption === option.id ? 'active' : ''}`}
                    onClick={() => setSelectedOption(option.id)}
                  >
                    <span className="option-icon">{option.icon}</span>
                    <span className="option-text">{option.to}</span>
                    <span className="option-rate">1 {option.from} = {option.rate.toLocaleString()} {option.to}</span>
                  </button>
                ))}
              </div>
            </div>

            {amount && selectedExchange && (
              <div className="exchange-summary">
                <div className="summary-row">
                  <span className="label">You send:</span>
                  <span className="value">{amount} {selectedExchange.from}</span>
                </div>
                <div className="summary-row">
                  <span className="label">You receive:</span>
                  <span className="value receive-amount">{calculateOutput()} {selectedExchange.to}</span>
                </div>
                <div className="summary-row">
                  <span className="label">Rate:</span>
                  <span className="value">1 {selectedExchange.from} = {selectedExchange.rate.toLocaleString()} {selectedExchange.to}</span>
                </div>
                <div className="summary-row fee">
                  <span className="label">Fee:</span>
                  <span className="value">~0.5% (estimated)</span>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary exchange-btn"
              onClick={handleExchange}
              disabled={!amount || parseFloat(amount) <= 0 || isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Exchange Now'}
            </button>

            <p className="exchange-note">
              ⚠️ TESTNET: Exchange rates are real-time from exchangerate-api.com. Exchange functionality is simulated.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExchangeMenu
