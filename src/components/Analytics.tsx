import { useEffect, useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { PAYROLL_CONTRACT_ABI, PAYROLL_CONTRACT_ADDRESS } from '../utils/contracts'
import './Analytics.css'

interface Payment {
  id: number
  worker: string
  amount: bigint
  timestamp: bigint
  isReleased: boolean
  isEscrowed: boolean
  employer: string
  escrowReleaseTime: bigint
}

interface AnalyticsData {
  totalPayments: number
  totalAmount: number
  averageAmount: number
  releasedPayments: number
  pendingPayments: number
  escrowedPayments: number
}

function Analytics() {
  const { address, publicClient } = useWallet()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalPayments: 0,
    totalAmount: 0,
    averageAmount: 0,
    releasedPayments: 0,
    pendingPayments: 0,
    escrowedPayments: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  const fetchAnalytics = async () => {
    if (!address || !publicClient) return

    setIsLoading(true)
    try {
      const counter = await publicClient.readContract({
        address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: PAYROLL_CONTRACT_ABI,
        functionName: 'paymentCounter'
      }) as bigint

      const payments: Payment[] = []
      for (let i = 1; i <= Number(counter); i++) {
        try {
          const payment = await publicClient.readContract({
            address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
            abi: PAYROLL_CONTRACT_ABI,
            functionName: 'payments',
            args: [BigInt(i)]
          }) as Payment

          // Only include payments from this employer
          if (payment.employer.toLowerCase() === address.toLowerCase()) {
            payments.push(payment)
          }
        } catch (error) {
          console.error(`Failed to fetch payment ${i}:`, error)
        }
      }

      const totalPayments = payments.length
      const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)
      const averageAmount = totalPayments > 0 ? totalAmount / totalPayments : 0
      const releasedPayments = payments.filter(p => p.isReleased).length
      const pendingPayments = payments.filter(p => !p.isReleased).length
      const escrowedPayments = payments.filter(p => p.isEscrowed).length

      setAnalyticsData({
        totalPayments,
        totalAmount: totalAmount / 1e6, // Convert from USDC (6 decimals) to readable format
        averageAmount: averageAmount / 1e6,
        releasedPayments,
        pendingPayments,
        escrowedPayments
      })
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [address, publicClient])

  return (
    <div className="analytics-section">
      <div className="section-header">
        <h3>Analytics Dashboard</h3>
        <button className="btn btn-secondary" onClick={fetchAnalytics} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-icon">💰</div>
          <div className="analytics-content">
            <h4>Total Payments</h4>
            <p className="analytics-value">{analyticsData.totalPayments}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">$</div>
          <div className="analytics-content">
            <h4>Total Amount Paid</h4>
            <p className="analytics-value">${analyticsData.totalAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">📊</div>
          <div className="analytics-content">
            <h4>Average Payment</h4>
            <p className="analytics-value">${analyticsData.averageAmount.toLocaleString()}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">✅</div>
          <div className="analytics-content">
            <h4>Released Payments</h4>
            <p className="analytics-value">{analyticsData.releasedPayments}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">⏳</div>
          <div className="analytics-content">
            <h4>Pending Payments</h4>
            <p className="analytics-value">{analyticsData.pendingPayments}</p>
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-icon">🔒</div>
          <div className="analytics-content">
            <h4>Escrowed Payments</h4>
            <p className="analytics-value">{analyticsData.escrowedPayments}</p>
          </div>
        </div>
      </div>

      <div className="payment-breakdown">
        <h4>Payment Status Breakdown</h4>
        <div className="progress-bar">
          <div 
            className="progress-segment released" 
            style={{ width: `${analyticsData.totalPayments > 0 ? (analyticsData.releasedPayments / analyticsData.totalPayments) * 100 : 0}%` }}
          >
            Released ({analyticsData.releasedPayments})
          </div>
          <div 
            className="progress-segment pending" 
            style={{ width: `${analyticsData.totalPayments > 0 ? (analyticsData.pendingPayments / analyticsData.totalPayments) * 100 : 0}%` }}
          >
            Pending ({analyticsData.pendingPayments})
          </div>
        </div>
      </div>
    </div>
  )
}

export default Analytics
