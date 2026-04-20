import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { WORKER_REGISTRY_ABI, WORKER_REGISTRY_ADDRESS, PAYROLL_CONTRACT_ABI, PAYROLL_CONTRACT_ADDRESS, USDC_ABI, USDC_ADDRESS, COMPANY_REGISTRY_ABI, COMPANY_REGISTRY_ADDRESS } from '../utils/contracts'
import KYCSection from './KYCSection'
import CompanyRegistration from './CompanyRegistration'
import CompanyProfile from './CompanyProfile'
import Analytics from './Analytics'
import './EmployerDashboard.css'

interface Worker {
  id: string
  name: string
  walletAddress: string
  country: string
  salary: number
  currency: string
  kycStatus: 'pending' | 'verified' | 'rejected'
}

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

function EmployerDashboard() {
  const { address, publicClient, walletClient } = useWallet()
  const [showRegistration, setShowRegistration] = useState(false)
  const [isCompanyRegistered, setIsCompanyRegistered] = useState(false)
  const [isCompanyVerified, setIsCompanyVerified] = useState(false)
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [workerAddress, setWorkerAddress] = useState('')
  const [workerNameInput, setWorkerNameInput] = useState('')
  const [workerSalary, setWorkerSalary] = useState('')
  const [addWorkerError, setAddWorkerError] = useState('')
  const [addWorkerSuccess, setAddWorkerSuccess] = useState('')
  const [editingWorker, setEditingWorker] = useState<Worker | null>(null)
  const [editSalary, setEditSalary] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [paymentCounter, setPaymentCounter] = useState(0)
  const [useEscrow, setUseEscrow] = useState(false)
  const [customEscrowDays, setCustomEscrowDays] = useState('7')
  const [estimatedGasCost, setEstimatedGasCost] = useState<string | null>(null)
  const [showGasEstimate, setShowGasEstimate] = useState(false)

  // Fetch payment history from contract
  const fetchPaymentHistory = async () => {
    if (!address || !publicClient || !isCompanyRegistered) return

    setIsLoadingHistory(true)
    try {
      const counter = await publicClient.readContract({
        address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: PAYROLL_CONTRACT_ABI,
        functionName: 'paymentCounter'
      }) as bigint

      setPaymentCounter(Number(counter))

      const payments: Payment[] = []
      for (let i = 1; i <= Number(counter); i++) {
        try {
          const payment = await publicClient.readContract({
            address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
            abi: PAYROLL_CONTRACT_ABI,
            functionName: 'payments',
            args: [BigInt(i)]
          }) as Payment

          // Only include payments created by this employer
          if (payment.employer.toLowerCase() === address.toLowerCase()) {
            payments.push(payment)
          }
        } catch (error) {
          console.error(`Failed to fetch payment ${i}:`, error)
        }
      }

      setPaymentHistory(payments.reverse())
    } catch (error) {
      console.error('Failed to fetch payment history:', error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Export payment history to CSV
  const exportToCSV = () => {
    if (paymentHistory.length === 0) return

    const headers = ['Payment ID', 'Worker Address', 'Amount (USDC)', 'Date', 'Status', 'Escrow', 'Escrow Release Time']
    const rows = paymentHistory.map(p => [
      p.id,
      p.worker,
      (Number(p.amount) / 1e6).toFixed(2),
      new Date(Number(p.timestamp) * 1000).toLocaleString(),
      p.isReleased ? 'Released' : 'Pending',
      p.isEscrowed ? 'Yes' : 'No',
      p.escrowReleaseTime > 0 ? new Date(Number(p.escrowReleaseTime) * 1000).toLocaleString() : 'N/A'
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `payment_history_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Estimate gas cost for payment
  const estimateGasCost = async () => {
    if (!publicClient || !address || selectedWorkers.length === 0) return

    try {
      const selectedWorkersData = workers.filter(w => selectedWorkers.includes(w.id))
      const workerAddresses = selectedWorkersData.map(w => w.walletAddress as `0x${string}`)
      const amounts = selectedWorkersData.map(w => BigInt(Math.floor(w.salary * 1e6)))
      const customEscrowTime = useEscrow && customEscrowDays
        ? BigInt(Math.floor(Date.now() / 1000) + (parseInt(customEscrowDays) * 24 * 60 * 60))
        : BigInt(0)

      // Estimate gas for batch payment
      const gasEstimate = await publicClient.estimateContractGas({
        address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
        abi: PAYROLL_CONTRACT_ABI,
        functionName: 'batchCreatePayments',
        args: [workerAddresses, amounts, useEscrow],
        account: address as `0x${string}`
      })

      const gasPrice = await publicClient.getGasPrice()
      const gasCostWei = gasEstimate * gasPrice
      const gasCostEth = Number(gasCostWei) / 1e18

      setEstimatedGasCost(`~${gasCostEth.toFixed(6)} ARC`)
      setShowGasEstimate(true)
    } catch (error) {
      console.error('Failed to estimate gas:', error)
      setEstimatedGasCost('Unable to estimate')
    }
  }

  // Check if company is already registered on mount
  useEffect(() => {
    const checkRegistration = async () => {
      if (address) {
        // Check contract state first
        try {
          const isRegistered = await publicClient.readContract({
            address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
            abi: COMPANY_REGISTRY_ABI,
            functionName: 'isCompany',
            args: [address as `0x${string}`]
          }) as boolean

          setIsCompanyRegistered(isRegistered)

          // Check if company is verified
          if (isRegistered) {
            try {
              const isVerified = await publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'isVerifiedCompany',
                args: [address as `0x${string}`]
              }) as boolean

              setIsCompanyVerified(isVerified)
            } catch (error) {
              console.error('Failed to check verification:', error)
              setIsCompanyVerified(false)
            }
          }
        } catch (error) {
          console.error('Failed to check registration:', error)
          // Fallback to localStorage
          const storedData = localStorage.getItem(`company_${address}`)
          setIsCompanyRegistered(!!storedData)
        }

        // Load workers from localStorage
        const storedWorkers = localStorage.getItem(`workers_${address}`)
        if (storedWorkers) {
          setWorkers(JSON.parse(storedWorkers))
        }
      }
    }

    checkRegistration()
  }, [address, publicClient])

  // Fetch payment history when company is registered
  useEffect(() => {
    if (isCompanyRegistered) {
      fetchPaymentHistory()
    }
  }, [isCompanyRegistered, address, publicClient])

  const handleClearRegistration = async () => {
    if (address) {
      localStorage.removeItem(`company_${address}`)
      localStorage.removeItem(`workers_${address}`)
      setIsCompanyRegistered(false)
      setWorkers([])

      // Force re-check registration
      try {
        const isRegistered = await publicClient.readContract({
          address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
          abi: COMPANY_REGISTRY_ABI,
          functionName: 'isCompany',
          args: [address as `0x${string}`]
        }) as boolean

        setIsCompanyRegistered(isRegistered)

        // Refresh CompanyProfile to load from contract if registered
        if (isRegistered && (window as any).refreshCompanyProfile) {
          setTimeout(() => {
            (window as any).refreshCompanyProfile()
          }, 100)
        }
      } catch (error) {
        console.error('Failed to check registration:', error)
        setIsCompanyRegistered(false)
      }
    }
  }

  const handleRegistrationComplete = (companyAddress: string) => {
    setIsCompanyRegistered(true)
    setShowRegistration(false)
    // Trigger registration check to fetch from contract
    const checkRegistration = async () => {
      if (address && publicClient) {
        try {
          const isRegistered = await publicClient.readContract({
            address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
            abi: COMPANY_REGISTRY_ABI,
            functionName: 'isCompany',
            args: [address as `0x${string}`]
          }) as boolean
          setIsCompanyRegistered(isRegistered)
        } catch (error) {
          console.error('Failed to check registration:', error)
        }
      }
    }
    checkRegistration()
    // Refresh CompanyProfile to load new localStorage data
    if ((window as any).refreshCompanyProfile) {
      (window as any).refreshCompanyProfile()
    }
  }
  const [workers, setWorkers] = useState<Worker[]>([])

  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [paymentAmount, setPaymentAmount] = useState('')

  const handleSelectWorker = (workerId: string) => {
    setSelectedWorkers(prev =>
      prev.includes(workerId)
        ? prev.filter(id => id !== workerId)
        : [...prev, workerId]
    )
  }

  const handlePaySelected = async () => {
    if (!walletClient || !publicClient || !address) {
      setPaymentError('Please connect your wallet first')
      return
    }

    if (selectedWorkers.length === 0) {
      setPaymentError('Please select at least one worker')
      return
    }

    setPaymentError('')
    setPaymentSuccess('')
    setIsPaying(true)

    try {
      // Calculate total amount (USDC uses 6 decimals)
      const totalAmount = workers
        .filter(w => selectedWorkers.includes(w.id))
        .reduce((sum, w) => sum + w.salary, 0)
      const totalAmountWei = BigInt(Math.floor(totalAmount * 1e6))

      // Check current allowance
      const currentAllowance = await publicClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, PAYROLL_CONTRACT_ADDRESS as `0x${string}`]
      }) as bigint

      // If allowance is insufficient, approve
      if (currentAllowance < totalAmountWei) {
        setIsApproving(true)
        const { request: approveRequest } = await publicClient.simulateContract({
          address: USDC_ADDRESS as `0x${string}`,
          abi: USDC_ABI,
          functionName: 'approve',
          args: [PAYROLL_CONTRACT_ADDRESS as `0x${string}`, totalAmountWei],
          account: address as `0x${string}`
        })

        const approveHash = await walletClient.writeContract({
          ...approveRequest,
          account: address as `0x${string}`
        })

        await publicClient.waitForTransactionReceipt({ hash: approveHash })
        setIsApproving(false)
      }

      // Prepare worker addresses and amounts
      const selectedWorkersData = workers.filter(w => selectedWorkers.includes(w.id))
      const workerAddresses = selectedWorkersData.map(w => w.walletAddress as `0x${string}`)
      const amounts = selectedWorkersData.map(w => BigInt(Math.floor(w.salary * 1e6)))

      // Calculate custom escrow time (convert days to seconds)
      const customEscrowTime = useEscrow && customEscrowDays
        ? BigInt(Math.floor(Date.now() / 1000) + (parseInt(customEscrowDays) * 24 * 60 * 60))
        : BigInt(0)

      // Try batch payments first, fallback to single payments
      let paymentHash: string
      try {
        // Create batch payments
        const { request: paymentRequest } = await publicClient.simulateContract({
          address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
          abi: PAYROLL_CONTRACT_ABI,
          functionName: 'batchCreatePayments',
          args: [workerAddresses, amounts, useEscrow], // use escrow setting
          account: address as `0x${string}`
        })

        paymentHash = await walletClient.writeContract({
          ...paymentRequest,
          account: address as `0x${string}`
        })
      } catch (batchError) {
        console.error('Batch payment failed, trying single payments:', batchError)
        // Fallback to single payments
        const hashes = []
        for (let i = 0; i < workerAddresses.length; i++) {
          const { request: paymentRequest } = await publicClient.simulateContract({
            address: PAYROLL_CONTRACT_ADDRESS as `0x${string}`,
            abi: PAYROLL_CONTRACT_ABI,
            functionName: 'createPayment',
            args: [workerAddresses[i], amounts[i], useEscrow, customEscrowTime], // use escrow settings
            account: address as `0x${string}`
          })

          const hash = await walletClient.writeContract({
            ...paymentRequest,
            account: address as `0x${string}`
          })

          await publicClient.waitForTransactionReceipt({ hash })
          hashes.push(hash)
        }
        paymentHash = hashes[0] // Use first hash for display
      }

      await publicClient.waitForTransactionReceipt({ hash: paymentHash })

      setPaymentSuccess(`Payment sent successfully to ${selectedWorkers.length} workers! Transaction: ${paymentHash}`)
      setSelectedWorkers([])
    } catch (error: any) {
      console.error('Payment failed:', error)
      setPaymentError(error.message || 'Payment failed. Please try again.')
    } finally {
      setIsPaying(false)
      setIsApproving(false)
    }
  }

  const calculateTotal = () => {
    const total = workers
      .filter(w => selectedWorkers.includes(w.id))
      .reduce((sum, w) => sum + w.salary, 0)
    return `${total.toLocaleString()} USDC`
  }

  const handleAddWorker = async () => {
    if (!workerNameInput || !workerAddress || !workerSalary) {
      setAddWorkerError('Please fill in all fields')
      return
    }

    setAddWorkerError('')
    setAddWorkerSuccess('')

    try {
      if (publicClient) {
        // Check if worker is registered
        const isRegistered = await publicClient.readContract({
          address: WORKER_REGISTRY_ADDRESS as `0x${string}`,
          abi: WORKER_REGISTRY_ABI,
          functionName: 'isWorker',
          args: [workerAddress as `0x${string}`]
        }) as boolean

        if (!isRegistered) {
          setAddWorkerError('Worker is not registered in the system')
          return
        }

        // Use input name or try to get from localStorage
        const workerLocalStorageData = localStorage.getItem(`worker_${workerAddress}`)
        let workerName = workerNameInput || 'Worker'
        let workerCountry = 'Unknown'
        let workerCurrency = 'USDC'

        if (!workerNameInput && workerLocalStorageData) {
          try {
            const parsed = JSON.parse(workerLocalStorageData)
            workerName = parsed.name || 'Worker'
            workerCountry = parsed.country || 'Unknown'
            workerCurrency = parsed.currency || 'USDC'
          } catch (e) {
            console.error('Failed to parse worker localStorage data:', e)
          }
        }

        const newWorker: Worker = {
          id: Date.now().toString(),
          name: workerName,
          walletAddress: workerAddress,
          country: workerCountry,
          salary: parseFloat(workerSalary),
          currency: workerCurrency,
          kycStatus: 'pending'
        }

        const updatedWorkers = [...workers, newWorker]
        setWorkers(updatedWorkers)
        
        // Save to localStorage
        if (address) {
          localStorage.setItem(`workers_${address}`, JSON.stringify(updatedWorkers))
        }
        
        setAddWorkerSuccess(`Worker ${workerName} added successfully!`)
        setWorkerAddress('')
        setWorkerNameInput('')
        setWorkerSalary('')
        setShowAddWorker(false)
      }
    } catch (error: any) {
      console.error('Failed to add worker:', error)
      setAddWorkerError(error.message || 'Failed to add worker')
    }
  }

  const handleEditWorker = (worker: Worker) => {
    setEditingWorker(worker)
    setEditSalary(worker.salary.toString())
  }

  const handleSaveEdit = () => {
    if (!editingWorker || !editSalary) return

    const updatedWorkers = workers.map(w => 
      w.id === editingWorker.id 
        ? { ...w, salary: parseFloat(editSalary) }
        : w
    )

    setWorkers(updatedWorkers)
    
    // Save to localStorage
    if (address) {
      localStorage.setItem(`workers_${address}`, JSON.stringify(updatedWorkers))
    }

    setEditingWorker(null)
    setEditSalary('')
  }

  if (showRegistration) {
    return <CompanyRegistration onRegistrationComplete={handleRegistrationComplete} />
  }

  return (
    <div className="employer-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h2>Employer Dashboard</h2>
          <p className="subtitle">Manage payroll for your remote team</p>
        </div>
        {!isCompanyRegistered && (
          <button
            className="btn btn-primary register-btn"
            onClick={() => setShowRegistration(true)}
          >
            Register Your Company
          </button>
        )}
        {isCompanyRegistered && (
          <button
            className="btn btn-secondary register-btn"
            onClick={handleClearRegistration}
          >
            Re-register
          </button>
        )}
      </div>

      {isCompanyRegistered && <CompanyProfile />}

      <KYCSection userType="employer" />

      <Analytics />

        <div className="payroll-section">
        <div className="section-header">
          <h3>Team Members</h3>
          <div className="actions">
            <button className="btn btn-secondary" onClick={() => setShowAddWorker(true)}>Add Worker</button>
            <button className="btn btn-secondary" onClick={estimateGasCost} disabled={selectedWorkers.length === 0 || !publicClient}>
              Estimate Gas
            </button>
            <button
              className="btn btn-primary"
              disabled={selectedWorkers.length === 0 || isPaying || isApproving || !isCompanyVerified}
              onClick={handlePaySelected}
            >
              {isApproving ? 'Approving USDC...' : isPaying ? 'Processing Payment...' : `Pay Selected (${selectedWorkers.length})`}
            </button>
          </div>
        </div>

        {isCompanyRegistered && !isCompanyVerified && (
          <div className="warning-message kyc-warning">
            <strong>KYC Verification Required</strong>
            <p>Your company must be KYC verified before you can make payments to workers. Please complete the KYC verification process.</p>
          </div>
        )}

        {showGasEstimate && estimatedGasCost && (
          <div className="info-message gas-estimate">
            <strong>Estimated Gas Cost:</strong> {estimatedGasCost}
          </div>
        )}

        <div className="escrow-config">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={useEscrow}
              onChange={(e) => setUseEscrow(e.target.checked)}
              disabled={isPaying || isApproving}
            />
            <span>Use Escrow for payments</span>
          </label>
          {useEscrow && (
            <div className="escrow-time-input">
              <label htmlFor="customEscrowDays">Escrow Duration (days):</label>
              <input
                type="number"
                id="customEscrowDays"
                value={customEscrowDays}
                onChange={(e) => setCustomEscrowDays(e.target.value)}
                min="1"
                max="365"
                disabled={isPaying || isApproving}
              />
            </div>
          )}
        </div>

        {paymentError && <div className="error-message">{paymentError}</div>}
        {paymentSuccess && <div className="success-message">{paymentSuccess}</div>}

        <div className="workers-list">
          <table className="workers-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={selectedWorkers.length === workers.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedWorkers(workers.map(w => w.id))
                      } else {
                        setSelectedWorkers([])
                      }
                    }}
                  />
                </th>
                <th>Name</th>
                <th>Wallet Address</th>
                <th>Country</th>
                <th>Salary</th>
                <th>KYC Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => (
                <tr key={worker.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedWorkers.includes(worker.id)}
                      onChange={() => handleSelectWorker(worker.id)}
                    />
                  </td>
                  <td>{worker.name}</td>
                  <td className="wallet-address">{worker.walletAddress}</td>
                  <td>{worker.country}</td>
                  <td>${worker.salary.toLocaleString()} {worker.currency}</td>
                  <td>
                    <span className={`status-badge ${worker.kycStatus}`}>
                      {worker.kycStatus}
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn btn-small" 
                      onClick={() => handleEditWorker(worker)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {workers.length === 0 && (
          <div className="empty-state">
            <p>No team members yet. Click "Add Worker" to add your first team member.</p>
          </div>
        )}

        <div className="payment-history-section">
          <div className="section-header">
            <h3>Payment History</h3>
            <div className="actions">
              <button className="btn btn-secondary" onClick={fetchPaymentHistory} disabled={isLoadingHistory}>
                {isLoadingHistory ? 'Loading...' : 'Refresh'}
              </button>
              <button className="btn btn-secondary" onClick={exportToCSV} disabled={paymentHistory.length === 0}>
                Export CSV
              </button>
            </div>
          </div>

          {isLoadingHistory ? (
            <div className="loading-state">Loading payment history...</div>
          ) : paymentHistory.length === 0 ? (
            <div className="empty-state">
              <p>No payment history yet.</p>
            </div>
          ) : (
            <div className="payments-list">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>Payment ID</th>
                    <th>Worker Address</th>
                    <th>Amount (USDC)</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Escrow</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map(payment => (
                    <tr key={payment.id}>
                      <td>#{payment.id}</td>
                      <td className="wallet-address">{payment.worker}</td>
                      <td>${(Number(payment.amount) / 1e6).toLocaleString()}</td>
                      <td>{new Date(Number(payment.timestamp) * 1000).toLocaleDateString()}</td>
                      <td>
                        <span className={`status-badge ${payment.isReleased ? 'released' : 'pending'}`}>
                          {payment.isReleased ? 'Released' : 'Pending'}
                        </span>
                      </td>
                      <td>{payment.isEscrowed ? 'Yes' : 'No'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showAddWorker && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Add Worker</h3>
              {addWorkerError && <div className="error-message">{addWorkerError}</div>}
              {addWorkerSuccess && <div className="success-message">{addWorkerSuccess}</div>}
              <div className="form-group">
                <label htmlFor="workerNameInput">Worker Name *</label>
                <input
                  type="text"
                  id="workerNameInput"
                  value={workerNameInput}
                  onChange={(e) => setWorkerNameInput(e.target.value)}
                  placeholder="e.g. John Doe"
                />
              </div>
              <div className="form-group">
                <label htmlFor="workerAddress">Worker Wallet Address *</label>
                <input
                  type="text"
                  id="workerAddress"
                  value={workerAddress}
                  onChange={(e) => setWorkerAddress(e.target.value)}
                  placeholder="0x..."
                />
              </div>
              <div className="form-group">
                <label htmlFor="workerSalary">Monthly Salary (USDC) *</label>
                <input
                  type="number"
                  id="workerSalary"
                  value={workerSalary}
                  onChange={(e) => setWorkerSalary(e.target.value)}
                  placeholder="e.g. 3000"
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowAddWorker(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleAddWorker}>Add Worker</button>
              </div>
            </div>
          </div>
        )}

        {editingWorker && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Edit Worker Salary</h3>
              <div className="form-group">
                <label>Worker: {editingWorker.name}</label>
              </div>
              <div className="form-group">
                <label htmlFor="editSalary">Monthly Salary (USDC) *</label>
                <input
                  type="number"
                  id="editSalary"
                  value={editSalary}
                  onChange={(e) => setEditSalary(e.target.value)}
                  placeholder="e.g. 3000"
                />
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setEditingWorker(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSaveEdit}>Save</button>
              </div>
            </div>
          </div>
        )}

        {selectedWorkers.length > 0 && (
          <div className="payment-summary">
            <div className="summary-card">
              <h4>Payment Summary</h4>
              <div className="summary-row">
                <span>Selected Workers:</span>
                <span>{selectedWorkers.length}</span>
              </div>
              <div className="summary-row">
                <span>Total Amount:</span>
                <span className="total-amount">{calculateTotal()}</span>
              </div>
              <div className="summary-row">
                <span>Network:</span>
                <span>Arc Testnet</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EmployerDashboard
