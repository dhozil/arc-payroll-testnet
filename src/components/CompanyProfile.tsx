import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { COMPANY_REGISTRY_ABI, COMPANY_REGISTRY_ADDRESS } from '../utils/contracts'
import './CompanyProfile.css'

interface CompanyData {
  name: string
  legalId: string
  country: string
  industry: string
  registeredAt: string
  status: 'Pending' | 'Active' | 'Suspended' | 'Inactive'
  totalWorkers: number
  totalPaid: number
}

const CompanyProfile = () => {
  const { address, publicClient, walletClient } = useWallet()
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', country: '', industry: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!address || !publicClient) {
        setIsLoading(false)
        return
      }

      try {
        // Check if company is registered
        const isRegistered = await publicClient.readContract({
          address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
          abi: COMPANY_REGISTRY_ABI,
          functionName: 'isCompany',
          args: [address as `0x${string}`]
        }) as boolean

        console.log('CompanyProfile: isRegistered =', isRegistered)

        if (!isRegistered) {
          setCompanyData(null)
          setIsLoading(false)
          return
        }

        // Try localStorage first
        const storedData = localStorage.getItem(`company_${address}`)
        console.log('CompanyProfile: storedData =', storedData)
        if (storedData) {
          const parsed = JSON.parse(storedData)
          console.log('CompanyProfile: parsed data =', parsed)
          setCompanyData(parsed)
        } else {
          // Fetch from contract using individual getter functions to avoid BigInt serialization
          console.log('CompanyProfile: Fetching from contract using individual getters')
          try {
            const [name, legalId, country, industry, registeredAt, status, totalWorkers] = await Promise.all([
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyName',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyLegalId',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyCountry',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyIndustry',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyRegisteredAt',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyStatus',
                args: [address as `0x${string}`]
              }),
              publicClient.readContract({
                address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
                abi: COMPANY_REGISTRY_ABI,
                functionName: 'getCompanyTotalWorkers',
                args: [address as `0x${string}`]
              })
            ]) as [string, string, string, string, bigint, number, bigint]

            const statusMap: ('Pending' | 'Active' | 'Suspended' | 'Inactive')[] = ['Pending', 'Active', 'Suspended', 'Inactive']
            const contractData: CompanyData = {
              name: name || 'Company',
              legalId: legalId || '',
              country: country || '',
              industry: industry || '',
              registeredAt: registeredAt ? new Date(Number(registeredAt) * 1000).toLocaleDateString() : new Date().toLocaleDateString(),
              status: statusMap[status] || 'Pending',
              totalWorkers: Number(totalWorkers || 0),
              totalPaid: 0
            }

            console.log('CompanyProfile: contractData =', contractData)
            setCompanyData(contractData)

            // Save to localStorage for future use
            localStorage.setItem(`company_${address}`, JSON.stringify(contractData))
          } catch (contractError) {
            console.error('CompanyProfile: Failed to fetch from contract:', contractError)
            setCompanyData(null)
          }
        }
      } catch (error) {
        console.error('Failed to fetch company data:', error)
        setCompanyData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompanyData()
  }, [address, publicClient, refreshKey])

  // Expose refresh function globally for external trigger
  useEffect(() => {
    ;(window as any).refreshCompanyProfile = () => {
      setRefreshKey(prev => prev + 1)
    }
  }, [])

  const handleEdit = async () => {
    if (!walletClient || !publicClient || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!editForm.name || !editForm.country || !editForm.industry) {
      setError('Please fill in all fields')
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { request } = await publicClient.simulateContract({
        address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
        abi: COMPANY_REGISTRY_ABI,
        functionName: 'updateCompanyInfo',
        args: [editForm.name, editForm.country, editForm.industry],
        account: address as `0x${string}`
      })

      const hash = await walletClient.writeContract({
        ...request,
        account: address as `0x${string}`
      })

      setSuccess('Update submitted! Waiting for confirmation...')
      await publicClient.waitForTransactionReceipt({ hash })
      setSuccess('Company information updated successfully!')

      // Update localStorage
      if (companyData) {
        const updatedData = { ...companyData, name: editForm.name, country: editForm.country, industry: editForm.industry }
        localStorage.setItem(`company_${address}`, JSON.stringify(updatedData))
        setCompanyData(updatedData)
      }

      setIsEditing(false)
    } catch (err: any) {
      console.error('Update error:', err)
      setError(err.message || 'Update failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!walletClient || !publicClient || !address) {
      setError('Please connect your wallet first')
      return
    }

    if (!confirm('Are you sure you want to deactivate your company? This cannot be undone.')) {
      return
    }

    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      const { request } = await publicClient.simulateContract({
        address: COMPANY_REGISTRY_ADDRESS as `0x${string}`,
        abi: COMPANY_REGISTRY_ABI,
        functionName: 'changeCompanyStatus',
        args: [address as `0x${string}`, 3], // 3 = Inactive
        account: address as `0x${string}`
      })

      const hash = await walletClient.writeContract({
        ...request,
        account: address as `0x${string}`
      })

      setSuccess('Deactivation submitted! Waiting for confirmation...')
      await publicClient.waitForTransactionReceipt({ hash })
      setSuccess('Company deactivated successfully!')

      // Update localStorage
      if (companyData) {
        const updatedData = { ...companyData, status: 'Inactive' as const }
        localStorage.setItem(`company_${address}`, JSON.stringify(updatedData))
        setCompanyData(updatedData)
      }
    } catch (err: any) {
      console.error('Deactivation error:', err)
      setError(err.message || 'Deactivation failed. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const startEdit = () => {
    if (companyData) {
      setEditForm({
        name: companyData.name,
        country: companyData.country,
        industry: companyData.industry
      })
      setIsEditing(true)
    }
  }

  if (isLoading) {
    return <div className="company-profile">Loading...</div>
  }

  if (!companyData) {
    return null
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return '#3fb950'
      case 'Pending':
        return '#d29922'
      case 'Suspended':
        return '#f85149'
      case 'Inactive':
        return '#8b949e'
      default:
        return '#8b949e'
    }
  }

  return (
    <div className="company-profile">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V7l8-4 8 4v14M8 21v-4a2 2 0 0 1 4 0v4" />
            </svg>
          </div>
          <div className="profile-title">
            <h2>{companyData.name}</h2>
            <div className="status-badge" style={{ backgroundColor: getStatusColor(companyData.status) + '20', color: getStatusColor(companyData.status) }}>
              {companyData.status}
            </div>
          </div>
          <div className="profile-actions">
            {!isEditing && (
              <button className="btn btn-secondary" onClick={startEdit} disabled={isSubmitting}>
                Edit
              </button>
            )}
            {isEditing && (
              <>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={isSubmitting}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleEdit} disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {isEditing && (
          <div className="edit-form">
            <h3>Edit Company Information</h3>
            <div className="form-group">
              <label>Company Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                value={editForm.country}
                onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
            <div className="form-group">
              <label>Industry</label>
              <input
                type="text"
                value={editForm.industry}
                onChange={(e) => setEditForm({ ...editForm, industry: e.target.value })}
                disabled={isSubmitting}
              />
            </div>
          </div>
        )}

        <div className="profile-sections">
          <div className="profile-section">
            <h3>Company Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Legal Business ID</label>
                <span>{companyData.legalId}</span>
              </div>
              <div className="info-item">
                <label>Country</label>
                <span>{companyData.country}</span>
              </div>
              <div className="info-item">
                <label>Industry</label>
                <span>{companyData.industry}</span>
              </div>
              <div className="info-item">
                <label>Registered On</label>
                <span>{formatDate(companyData.registeredAt)}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{companyData.totalWorkers}</div>
                <div className="stat-label">Total Workers</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">${companyData.totalPaid.toLocaleString()}</div>
                <div className="stat-label">Total Paid (USDC)</div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Wallet Information</h3>
            <div className="wallet-info">
              <label>Company Wallet Address</label>
              <span className="wallet-address">{address}</span>
            </div>
          </div>

          {companyData.status === 'Pending' && (
            <div className="profile-section">
              <div className="kyc-pending">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <h4>KYC Verification Pending</h4>
                  <p>Your company registration is currently under review. KYC verification typically takes 24-48 hours.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CompanyProfile
