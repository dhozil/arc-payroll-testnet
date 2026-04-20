import { useState, useEffect } from 'react'
import { useWallet } from '../contexts/WalletContext'
import { WORKER_REGISTRY_ABI, WORKER_REGISTRY_ADDRESS } from '../utils/contracts'
import './WorkerProfile.css'

interface WorkerData {
  name: string
  email: string
  country: string
  currency: string
  registeredAt: string
  status: 'Pending' | 'Active' | 'Suspended' | 'Inactive'
  employer: string
  salary: number
  totalEarned: number
}

const WorkerProfile = () => {
  const { address, publicClient, walletClient } = useWallet()
  const [workerData, setWorkerData] = useState<WorkerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWorkerRegistered, setIsWorkerRegistered] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    country: '',
    currency: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  useEffect(() => {
    const fetchWorkerData = async () => {
      console.log('WorkerProfile: Starting fetch, address =', address, 'publicClient =', !!publicClient)
      
      if (!address || !publicClient) {
        console.log('WorkerProfile: Missing address or publicClient, using localStorage fallback')
        setIsLoading(false)
        // Try localStorage fallback
        const storedData = localStorage.getItem(`worker_${address}`)
        if (storedData) {
          setWorkerData(JSON.parse(storedData))
          setIsWorkerRegistered(true)
        }
        return
      }

      try {
        console.log('WorkerProfile: WORKER_REGISTRY_ADDRESS =', WORKER_REGISTRY_ADDRESS)
        
        // Check if worker is registered with timeout
        const isRegistered = await Promise.race([
          publicClient.readContract({
            address: WORKER_REGISTRY_ADDRESS as `0x${string}`,
            abi: WORKER_REGISTRY_ABI,
            functionName: 'isWorker',
            args: [address as `0x${string}`]
          }) as Promise<boolean>,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Contract call timeout')), 5000)
          )
        ])

        console.log('WorkerProfile: isRegistered =', isRegistered)
        setIsWorkerRegistered(isRegistered)

        if (isRegistered) {
          // For now, use localStorage data since getWorker has BigInt issues
          const storedData = localStorage.getItem(`worker_${address}`)
          if (storedData) {
            setWorkerData(JSON.parse(storedData))
          } else {
            // Worker registered but no localStorage data - use placeholder
            setWorkerData({
              name: 'Worker',
              email: '',
              country: '',
              currency: 'USD',
              registeredAt: new Date().toISOString(),
              status: 'Active',
              employer: '',
              salary: 0,
              totalEarned: 0
            })
          }
        } else {
          // Worker not registered in contract
          setWorkerData(null)
        }
      } catch (error) {
        console.error('WorkerProfile: Failed to fetch worker data:', error)
        setIsWorkerRegistered(false)
        // Fallback to localStorage
        const storedData = localStorage.getItem(`worker_${address}`)
        if (storedData) {
          setWorkerData(JSON.parse(storedData))
        } else {
          setWorkerData(null)
        }
      } finally {
        console.log('WorkerProfile: Setting isLoading to false')
        setIsLoading(false)
      }
    }

    fetchWorkerData()
  }, [address, publicClient])

  if (isLoading) {
    return <div className="worker-profile">Loading...</div>
  }

  const handleClearRegistration = async () => {
    if (address) {
      localStorage.removeItem(`worker_${address}`)
      setIsWorkerRegistered(false)
      setWorkerData(null)
    }
  }

  if (!workerData) {
    return (
      <div className="worker-profile">
        <div className="profile-card">
          <div className="profile-header">
            <h2>Worker Profile</h2>
          </div>
          <div className="empty-state">
            {!isWorkerRegistered ? (
              <>
                <p>You are not registered in the Worker Registry.</p>
                <p>Please register through the Worker Registration form.</p>
              </>
            ) : (
              <p>Loading worker data...</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleEdit = () => {
    if (workerData) {
      setEditForm({
        name: workerData.name,
        email: workerData.email,
        country: workerData.country,
        currency: workerData.currency
      })
      setIsEditing(true)
      setSaveError('')
      setSaveSuccess('')
    }
  }

  const handleSave = async () => {
    if (!editForm.name || !editForm.email || !editForm.country || !editForm.currency) {
      setSaveError('Please fill in all fields')
      return
    }

    setIsSaving(true)
    setSaveError('')
    setSaveSuccess('')

    try {
      // Update localStorage
      if (address) {
        const updatedData = {
          ...workerData,
          name: editForm.name,
          email: editForm.email,
          country: editForm.country,
          currency: editForm.currency
        }
        localStorage.setItem(`worker_${address}`, JSON.stringify(updatedData))
        setWorkerData(updatedData)
      }

      // Try to update contract (optional, may fail due to BigInt or if not registered on-chain)
      if (walletClient && publicClient) {
        try {
          const { request } = await publicClient.simulateContract({
            address: WORKER_REGISTRY_ADDRESS as `0x${string}`,
            abi: WORKER_REGISTRY_ABI,
            functionName: 'updateWorkerInfo',
            args: [editForm.name, editForm.email, editForm.country, editForm.currency]
          })

          const hash = await walletClient.writeContract({
            ...request,
            account: address as `0x${string}`
          })

          await publicClient.waitForTransactionReceipt({ hash })
          setSaveSuccess('Profile updated successfully on blockchain!')
        } catch (contractError: any) {
          // Check if error is WorkerNotFound
          if (contractError.message?.includes('WorkerNotFound') || contractError.name === 'ContractFunctionRevertedError') {
            setSaveSuccess('Profile updated in local storage. Worker not found on blockchain - please register on-chain to enable blockchain updates.')
          } else {
            setSaveSuccess('Profile updated in local storage. Blockchain update failed.')
          }
        }
      } else {
        setSaveSuccess('Profile updated successfully!')
      }

      setIsEditing(false)
    } catch (error: any) {
      console.error('Failed to save:', error)
      setSaveError(error.message || 'Failed to save changes')
    } finally {
      setIsSaving(false)
    }
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
    <div className="worker-profile">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="profile-title">
            <h2>{workerData.name}</h2>
            <div className="status-badge" style={{ backgroundColor: getStatusColor(workerData.status) + '20', color: getStatusColor(workerData.status) }}>
              {workerData.status}
            </div>
          </div>
          <button className="edit-profile-btn" onClick={handleEdit}>
            Edit Profile
          </button>
        </div>

        <div className="profile-sections">
          <div className="profile-section">
            <h3>Personal Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Email Address</label>
                <span>{workerData.email}</span>
              </div>
              <div className="info-item">
                <label>Country</label>
                <span>{workerData.country}</span>
              </div>
              <div className="info-item">
                <label>Preferred Currency</label>
                <span>{workerData.currency}</span>
              </div>
              <div className="info-item">
                <label>Registered On</label>
                <span>{formatDate(workerData.registeredAt)}</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Employment Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Current Employer</label>
                <span>{workerData.employer || 'Not assigned'}</span>
              </div>
              <div className="info-item">
                <label>Salary</label>
                <span>${workerData.salary.toLocaleString()} USDC</span>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Earnings</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">${workerData.totalEarned.toLocaleString()}</div>
                <div className="stat-label">Total Earned (USDC)</div>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Wallet Information</h3>
            <div className="wallet-info">
              <label>Worker Wallet Address</label>
              <span className="wallet-address">{address}</span>
            </div>
          </div>

          {workerData.status === 'Pending' && (
            <div className="profile-section">
              <div className="kyc-pending">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div>
                  <h4>KYC Verification Pending</h4>
                  <p>Your worker registration is currently under review. KYC verification typically takes 24-48 hours.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Edit Profile</h3>
              {saveError && <div className="error-message">{saveError}</div>}
              {saveSuccess && <div className="success-message">{saveSuccess}</div>}
              <div className="form-group">
                <label htmlFor="editName">Name *</label>
                <input
                  type="text"
                  id="editName"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  placeholder="Your name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editEmail">Email *</label>
                <input
                  type="email"
                  id="editEmail"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="editCountry">Country *</label>
                <select
                  id="editCountry"
                  value={editForm.country}
                  onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                >
                  <option value="">Select Country</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Singapore">Singapore</option>
                  <option value="Malaysia">Malaysia</option>
                  <option value="Thailand">Thailand</option>
                  <option value="Vietnam">Vietnam</option>
                  <option value="Philippines">Philippines</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Germany">Germany</option>
                  <option value="France">France</option>
                  <option value="Japan">Japan</option>
                  <option value="South Korea">South Korea</option>
                  <option value="China">China</option>
                  <option value="India">India</option>
                  <option value="Australia">Australia</option>
                  <option value="Canada">Canada</option>
                  <option value="Brazil">Brazil</option>
                  <option value="Argentina">Argentina</option>
                  <option value="Mexico">Mexico</option>
                  <option value="South Africa">South Africa</option>
                  <option value="Nigeria">Nigeria</option>
                  <option value="Egypt">Egypt</option>
                  <option value="Turkey">Turkey</option>
                  <option value="Saudi Arabia">Saudi Arabia</option>
                  <option value="UAE">United Arab Emirates</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="editCurrency">Preferred Currency *</label>
                <select
                  id="editCurrency"
                  value={editForm.currency}
                  onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
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
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkerProfile
