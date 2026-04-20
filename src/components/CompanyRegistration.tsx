import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { COMPANY_REGISTRY_ABI, COMPANY_REGISTRY_ADDRESS } from '../utils/contracts'
import { parseEther } from 'viem'
import './CompanyRegistration.css'

interface CompanyRegistrationProps {
  onRegistrationComplete?: (companyAddress: string) => void
}

const CompanyRegistration = ({ onRegistrationComplete }: CompanyRegistrationProps) => {
  const { isConnected, address, walletClient, publicClient } = useWallet()
  const [formData, setFormData] = useState({
    name: '',
    legalId: '',
    country: '',
    industry: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

    if (!formData.name || !formData.legalId || !formData.country || !formData.industry) {
      setError('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      console.log('CompanyRegistration: Starting registration...')

      // Check if company is already registered
      const isRegistered = await publicClient.readContract({
        address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
        abi: COMPANY_REGISTRY_ABI,
        functionName: 'isCompany',
        args: [address as `0x${string}`]
      }) as boolean

      console.log('CompanyRegistration: isRegistered =', isRegistered)

      if (isRegistered) {
        // Company is already registered, call completion callback
        console.log('CompanyRegistration: Already registered, calling completion callback')
        if (onRegistrationComplete && address) {
          onRegistrationComplete(address)
        }
        setIsSubmitting(false)
        return
      }

      // Call CompanyRegistry contract
      console.log('CompanyRegistration: Calling registerCompany...')
      const { request } = await publicClient.simulateContract({
        address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
        abi: COMPANY_REGISTRY_ABI,
        functionName: 'registerCompany',
        args: [
          formData.name,
          formData.legalId,
          formData.country,
          formData.industry
        ]
      })

      console.log('CompanyRegistration: Simulation successful, submitting transaction...')
      const hash = await walletClient.writeContract({
        ...request,
        account: address as `0x${string}`
      })
      console.log('CompanyRegistration: Transaction submitted, hash =', hash)
      setSuccess('Company registration transaction submitted! Waiting for confirmation...')

      // Wait for transaction confirmation
      console.log('CompanyRegistration: Waiting for transaction receipt...')
      await publicClient.waitForTransactionReceipt({ hash })
      console.log('CompanyRegistration: Transaction confirmed')

      setSuccess('Company registration submitted successfully! Waiting for KYC verification.')

      // Save to localStorage as backup
      console.log('CompanyRegistration: Saving to localStorage...')
      if (address) {
        const companyData = {
          name: formData.name,
          legalId: formData.legalId,
          country: formData.country,
          industry: formData.industry,
          registeredAt: new Date().toISOString(),
          status: 'Pending',
          totalWorkers: 0,
          totalPaid: 0
        }
        localStorage.setItem(`company_${address}`, JSON.stringify(companyData))
        console.log('CompanyRegistration: Saved to localStorage', companyData)
      }

      // Small delay to ensure localStorage save completes
      await new Promise(resolve => setTimeout(resolve, 100))

      console.log('CompanyRegistration: Calling onRegistrationComplete...')
      if (onRegistrationComplete && address) {
        onRegistrationComplete(address)
      }

      // Reset form
      setFormData({
        name: '',
        legalId: '',
        country: '',
        industry: ''
      })
      console.log('CompanyRegistration: Registration complete')
    } catch (err: any) {
      console.error('Registration error:', err)
      // Clear localStorage on error to prevent invalid state
      if (address) {
        localStorage.removeItem(`company_${address}`)
      }

      // Parse error message for better display
      let errorMessage = 'Registration failed. Please try again.'
      if (err.message) {
        if (err.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for gas. Please add more ARC tokens.'
        } else if (err.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user.'
        } else if (err.message.includes('already registered')) {
          errorMessage = 'This wallet is already registered as a company.'
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
    <div className="company-registration">
      <div className="registration-card">
        <h2>Register Your Company</h2>
        <p className="subtitle">Complete your company registration to start using the payroll system</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit} className="registration-form">
          <div className="form-group">
            <label htmlFor="name">Company Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your company name"
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="legalId">Legal Business ID / Tax ID *</label>
            <input
              type="text"
              id="legalId"
              name="legalId"
              value={formData.legalId}
              onChange={handleInputChange}
              placeholder="Enter your legal business ID or tax ID"
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
            <label htmlFor="industry">Industry *</label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleInputChange}
              disabled={isSubmitting}
              required
            >
              <option value="">Select industry</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="Education">Education</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Consulting">Consulting</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isSubmitting || !isConnected || !walletClient || !publicClient}
          >
            {isSubmitting ? 'Registering...' : !isConnected || !walletClient || !publicClient ? 'Connect Wallet First' : 'Register Company'}
          </button>
        </form>

        <div className="info-box">
          <h3>What happens next?</h3>
          <ol>
            <li>Your registration will be submitted to the blockchain</li>
            <li>KYC verification will be required</li>
            <li>Once verified, you can start adding workers and processing payments</li>
            <li>Verification typically takes 24-48 hours</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default CompanyRegistration
