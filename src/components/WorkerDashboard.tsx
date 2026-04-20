import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { PAYROLL_CONTRACT_ABI, PAYROLL_CONTRACT_ADDRESS, WORKER_REGISTRY_ABI, WORKER_REGISTRY_ADDRESS } from '../utils/contracts'
import KYCSection from './KYCSection'
import WorkerRegistration from './WorkerRegistration'
import WorkerProfile from './WorkerProfile'
import ExchangeMenu from './ExchangeMenu'
import BankAccountIntegration from './BankAccountIntegration'
import './WorkerDashboard.css'

interface Payment {
  id: string
  from: string
  amount: number
  currency: string
  date: string
  status: string
  isReleased: boolean
  paymentId: string
}

function WorkerDashboard() {
  const { isConnected, balance, address, publicClient, walletClient } = useWallet()
  const [showRegistration, setShowRegistration] = useState(false)
  const [isWorkerRegistered, setIsWorkerRegistered] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [isReleasing, setIsReleasing] = useState(false)
  const [releaseError, setReleaseError] = useState('')
  const [releaseSuccess, setReleaseSuccess] = useState('')

  // Check if worker is already registered on mount
  useEffect(() => {
    const checkWorkerRegistration = async () => {
      if (!address || !publicClient) return

      try {
        const isRegistered = await publicClient.readContract({
          address: WORKER_REGISTRY_ADDRESS as `0x${string}`,
          abi: WORKER_REGISTRY_ABI,
          functionName: 'isWorker',
          args: [address as `0x${string}`]
        }) as boolean

        setIsWorkerRegistered(isRegistered)

        if (!isRegistered) {
          // Clear localStorage if not registered on-chain
          localStorage.removeItem(`worker_${address}`)
        }
      } catch (error) {
        console.error('Failed to check worker registration:', error)
        // Fallback to localStorage
        const storedData = localStorage.getItem(`worker_${address}`)
        setIsWorkerRegistered(!!storedData)
      }

      // Fetch pending payments
      fetchPayments()
    }

    checkWorkerRegistration()
  }, [address, publicClient])

  const fetchPayments = async () => {
    if (!address || !publicClient) return

    try {
      const paymentIds = await publicClient.readContract({
        address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: PAYROLL_CONTRACT_ABI,
        functionName: 'getWorkerPayments',
        args: [address as `0x${string}`]
      }) as bigint[]

      const paymentDetails = await Promise.all(
        paymentIds.map(async (id) => {
          const payment = await publicClient.readContract({
            address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
            abi: PAYROLL_CONTRACT_ABI,
            functionName: 'getPayment',
            args: [id]
          }) as any

          return {
            id: id.toString(),
            from: payment.employer,
            amount: Number(payment.amount) / 1e6, // Convert from 6 decimals
            currency: 'USDC',
            date: new Date(Number(payment.timestamp) * 1000).toLocaleDateString(),
            status: payment.isReleased ? 'Released' : 'Pending',
            isReleased: payment.isReleased,
            paymentId: id.toString()
          }
        })
      )

      setPayments(paymentDetails)
    } catch (error) {
      console.error('Failed to fetch payments:', error)
    }
  }

  const handleReleasePayment = async (paymentId: string) => {
    if (!walletClient || !publicClient || !address) {
      setReleaseError('Please connect your wallet first')
      return
    }

    setReleaseError('')
    setReleaseSuccess('')
    setIsReleasing(true)

    try {
      const { request } = await publicClient.simulateContract({
        address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: PAYROLL_CONTRACT_ABI,
        functionName: 'releasePayment',
        args: [BigInt(paymentId)],
        account: address as `0x${string}`
      })

      const hash = await walletClient.writeContract({
        ...request,
        account: address as `0x${string}`
      })

      await publicClient.waitForTransactionReceipt({ hash })

      setReleaseSuccess(`Payment released successfully! Transaction: ${hash}`)
      await fetchPayments() // Refresh payments
    } catch (error: any) {
      console.error('Failed to release payment:', error)
      setReleaseError(error.message || 'Failed to release payment')
    } finally {
      setIsReleasing(false)
    }
  }

  const handleRegistrationComplete = (workerAddress: string) => {
    setIsWorkerRegistered(true)
    setShowRegistration(false)
  }

  if (showRegistration) {
    return <WorkerRegistration onRegistrationComplete={handleRegistrationComplete} />
  }

  return (
    <div className="worker-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2>Worker Dashboard</h2>
            <p className="subtitle">View your payments and manage your wallet</p>
          </div>
          {!isWorkerRegistered && (
            <button
              className="btn btn-primary register-btn"
              onClick={() => setShowRegistration(true)}
            >
              Register as Worker
            </button>
          )}
        </div>
      </div>

      {isWorkerRegistered && <WorkerProfile />}

      <KYCSection userType="worker" />

      <div className="dashboard-grid">
        <div className="left-column">
          <ExchangeMenu />
          <BankAccountIntegration />
        </div>

        <div className="right-column">
          <div className="payments-section">
            <div className="section-header">
              <h3>Payment History</h3>
              <button className="btn btn-secondary" onClick={fetchPayments}>Refresh</button>
            </div>

            {releaseError && <div className="error-message">{releaseError}</div>}
            {releaseSuccess && <div className="success-message">{releaseSuccess}</div>}

            <div className="payments-list">
              {payments.length === 0 ? (
                <div className="empty-state">
                  <p>No payment history yet. Payments will appear here once you receive payments from employers.</p>
                </div>
              ) : (
                <table className="payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>From</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(payment => (
                      <tr key={payment.id}>
                        <td>{payment.date}</td>
                        <td className="wallet-address">{payment.from}</td>
                        <td className="amount-cell">${payment.amount.toLocaleString()} {payment.currency}</td>
                        <td>
                          <span className={`status-badge ${payment.status.toLowerCase()}`}>
                            {payment.status}
                          </span>
                        </td>
                        <td>
                          {!payment.isReleased && (
                            <button
                              className="btn btn-small btn-primary"
                              onClick={() => handleReleasePayment(payment.paymentId)}
                              disabled={isReleasing}
                            >
                              {isReleasing ? 'Releasing...' : 'Release'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WorkerDashboard
