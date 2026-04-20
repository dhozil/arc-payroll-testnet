import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { WORKER_REGISTRY_ABI, WORKER_REGISTRY_ADDRESS, COMPANY_REGISTRY_ABI, COMPANY_REGISTRY_ADDRESS } from '../utils/contracts'
import './WorkerRegistration.css'

interface WorkerRegistrationProps {
  onRegistrationComplete?: (workerAddress: string) => void
}

const WorkerRegistration = ({ onRegistrationComplete }: WorkerRegistrationProps) => {
  const { isConnected, address, walletClient, publicClient } = useWallet()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    country: '',
    currency: 'USD',
    employerAddress: '',
    expectedSalary: ''
  })
  const [companyInfo, setCompanyInfo] = useState<any>(null)
  const [isLoadingCompany, setIsLoadingCompany] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Fetch company info when employer address is entered
  useEffect(() => {
    const fetchCompanyInfo = async () => {
      if (!formData.employerAddress || !publicClient) {
        setCompanyInfo(null)
        return
      }

      setIsLoadingCompany(true)
      try {
        const isRegistered = await publicClient.readContract({
          address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
          abi: COMPANY_REGISTRY_ABI,
          functionName: 'isCompany',
          args: [formData.employerAddress as `0x${string}`]
        }) as boolean

        if (isRegistered) {
          // Company is registered, try to fetch details
          try {
            const data = await publicClient.readContract({
              address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
              abi: COMPANY_REGISTRY_ABI,
              functionName: 'getCompany',
              args: [formData.employerAddress as `0x${string}`]
            }) as any

            setCompanyInfo({
              name: data.name || data[0] || 'Registered Company',
              legalId: data.legalId || data[1] || '',
              country: data.country || data[2] || '',
              industry: data.industry || data[3] || '',
              status: data.status || data[4] || 1
            })
          } catch (detailError) {
            console.error('Failed to fetch company details (BigInt issue):', detailError)
            // Still show as registered but without details
            setCompanyInfo({
              name: 'Registered Company',
              legalId: '',
              country: '',
              industry: '',
              status: 1
            })
          }
        } else {
          setCompanyInfo(null)
        }
      } catch (error) {
        console.error('Failed to check company registration:', error)
        setCompanyInfo(null)
      } finally {
        setIsLoadingCompany(false)
      }
    }

    fetchCompanyInfo()
  }, [formData.employerAddress, publicClient])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isConnected || !walletClient || !publicClient) {
      setError('Please connect your wallet first')
      return
    }

    if (!formData.name || !formData.email || !formData.country || !formData.currency) {
      setError('Please fill in all required fields')
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      // Check if worker is already registered
      const isRegistered = await publicClient.readContract({
        address: WORKER_REGISTRY_ADDRESS as `0x${string}`,
        abi: WORKER_REGISTRY_ABI,
        functionName: 'isWorker',
        args: [address as `0x${string}`]
      }) as boolean

      if (isRegistered) {
        setError('This wallet is already registered as a worker')
        // Load existing data
        if (address) {
          const existingData = localStorage.getItem(`worker_${address}`)
          if (existingData) {
            const parsed = JSON.parse(existingData)
            setFormData({
              name: parsed.name || '',
              email: parsed.email || '',
              country: parsed.country || '',
              currency: parsed.currency || 'USD',
              employerAddress: formData.employerAddress,
              expectedSalary: formData.expectedSalary
            })
          }
        }
        setIsSubmitting(false)
        return
      }

      // Call WorkerRegistry contract
      const { request } = await publicClient.simulateContract({
        address: WORKER_REGISTRY_ADDRESS as `0x${string}`,
        abi: WORKER_REGISTRY_ABI,
        functionName: 'registerWorker',
        args: [
          formData.name,
          formData.email,
          formData.country,
          formData.currency
        ]
      })

      const hash = await walletClient.writeContract({
        ...request,
        account: address as `0x${string}`
      })
      setSuccess('Worker registration transaction submitted! Waiting for confirmation...')

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash })

      setSuccess('Worker registration submitted successfully! Waiting for KYC verification.')

      // Save to localStorage as backup
      if (address) {
        const workerData = {
          name: formData.name,
          email: formData.email,
          country: formData.country,
          currency: formData.currency,
          registeredAt: new Date().toISOString(),
          status: 'Pending',
          employer: formData.employerAddress || '',
          salary: formData.expectedSalary || 0,
          totalEarned: 0
        }
        localStorage.setItem(`worker_${address}`, JSON.stringify(workerData))
      }

      if (onRegistrationComplete && address) {
        onRegistrationComplete(address)
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        country: '',
        currency: 'USD',
        employerAddress: '',
        expectedSalary: ''
      })
    } catch (err: any) {
      console.error('Registration error:', err)
      // Clear localStorage on error to prevent invalid state
      if (address) {
        localStorage.removeItem(`worker_${address}`)
      }

      // Parse error message for better display
      let errorMessage = 'Registration failed. Please try again.'
      if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas. Please add more ARC tokens.'
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user.'
        } else if (err.message.includes('already registered')) {
          errorMessage = 'This wallet is already registered as a worker.'
        } else {
          errorMessage = err.message
        }
      }
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="worker-registration">
      <div className="registration-card">
        <h2>Register as Worker</h2>
        <p className="subtitle">Complete your worker registration to start receiving payments</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email address"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="country">Country *</label>
            <select
              id="country"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              disabled={isSubmitting}
              required
            >
              <option value="">Select country</option>
              <option value="ID">Indonesia</option>
              <option value="US">United States</option>
              <option value="SG">Singapore</option>
              <option value="MY">Malaysia</option>
              <option value="TH">Thailand</option>
              <option value="VN">Vietnam</option>
              <option value="PH">Philippines</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="currency">Preferred Payout Currency *</label>
            <select
              id="currency"
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              disabled={isSubmitting}
              required
            >
              <option value="USD">US Dollar (USD)</option>
              <option value="IDR">Indonesian Rupiah (IDR)</option>
              <option value="SGD">Singapore Dollar (SGD)</option>
              <option value="MYR">Malaysian Ringgit (MYR)</option>
              <option value="THB">Thai Baht (THB)</option>
              <option value="VND">Vietnamese Dong (VND)</option>
              <option value="PHP">Philippine Peso (PHP)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">British Pound (GBP)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="employerAddress">Employer Wallet Address (Optional)</label>
            <input
              type="text"
              id="employerAddress"
              name="employerAddress"
              value={formData.employerAddress}
              onChange={handleInputChange}
              placeholder="Enter employer wallet address"
              disabled={isSubmitting}
            />
            {isLoadingCompany && <p className="loading-text">Checking employer...</p>}
            {companyInfo && (
              <div className="company-info">
                <p><strong>Company:</strong> {companyInfo.name}</p>
                <p><strong>Industry:</strong> {companyInfo.industry}</p>
                <p><strong>Status:</strong> {companyInfo.status === 1 ? 'Active' : 'Pending'}</p>
              </div>
            )}
            {formData.employerAddress && !companyInfo && !isLoadingCompany && (
              <p className="warning-text">Employer not found or not registered</p>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="expectedSalary">Expected Monthly Salary (USDC)</label>
            <input
              type="number"
              id="expectedSalary"
              name="expectedSalary"
              value={formData.expectedSalary}
              onChange={handleInputChange}
              placeholder="e.g. 3000"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || !isConnected || !walletClient || !publicClient}
          >
            {isSubmitting ? 'Registering...' : !isConnected || !walletClient || !publicClient ? 'Connect Wallet First' : 'Register Worker'}
          </button>
        </form>

        <div className="info-box">
          <h3>What happens next?</h3>
          <ol>
            <li>Your registration will be submitted to the blockchain</li>
            <li>KYC verification will be required</li>
            <li>Once verified, employers can hire you and send payments</li>
            <li>You can connect your bank account for withdrawals</li>
            <li>Verification typically takes 24-48 hours</li>
          </ol>
        </div>

        <div className="wallet-info">
          <h3>Wallet Address</h3>
          <p className="wallet-address">
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
          </p>
          <p className="wallet-note">
            This wallet address will be used to receive USDC payments
          </p>
        </div>
      </div>
    </div>
  )
}

export default WorkerRegistration
