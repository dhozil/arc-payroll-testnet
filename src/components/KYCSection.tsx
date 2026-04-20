import { useState } from 'react'
import './KYCSection.css'

interface KYCSectionProps {
  userType: 'employer' | 'worker'
}

function KYCSection({ userType }: KYCSectionProps) {
  const [kycStatus, setKycStatus] = useState<'not_started' | 'pending' | 'verified'>('not_started')
  const [showKYCForm, setShowKYCForm] = useState(false)

  const handleStartKYC = () => {
    setShowKYCForm(true)
  }

  const handleSubmitKYC = (e: React.FormEvent) => {
    e.preventDefault()
    // In testnet, we just simulate the submission
    setKycStatus('pending')
    setShowKYCForm(false)
    alert('⚠️ TESTNET: KYC submission simulated\n\nIn production, this would submit to a KYC provider.')
  }

  return (
    <div className="kyc-section">
      <div className="section-header">
        <h3>KYC Verification</h3>
        <div className="testnet-notice">
          🔒 TESTNET: KYC is disabled for testing
        </div>
      </div>

      <div className="kyc-content">
        {kycStatus === 'not_started' && !showKYCForm && (
          <div className="kyc-card">
            <div className="kyc-icon">📋</div>
            <h4>Complete Your KYC</h4>
            <p>
              To use {userType === 'employer' ? 'employer' : 'worker'} features, 
              you need to complete identity verification.
            </p>
            <div className="kyc-requirements">
              <div className="requirement-item">
                <span className="check-icon">✓</span>
                <span>Government ID</span>
              </div>
              <div className="requirement-item">
                <span className="check-icon">✓</span>
                <span>Proof of Address</span>
              </div>
              <div className="requirement-item">
                <span className="check-icon">✓</span>
                <span>Selfie Verification</span>
              </div>
            </div>
            <button className="btn btn-primary kyc-button" onClick={handleStartKYC}>
              Start KYC Process
            </button>
            <p className="kyc-note">
              ⚠️ KYC verification is locked in testnet mode. 
              This is a demo of the UI only.
            </p>
          </div>
        )}

        {showKYCForm && (
          <div className="kyc-form-card">
            <h4>KYC Application Form</h4>
            <form onSubmit={handleSubmitKYC}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Enter your full name" disabled />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="Enter your email" disabled />
              </div>
              <div className="form-group">
                <label>Country of Residence</label>
                <select disabled>
                  <option value="">Select country</option>
                  <option value="ID">Indonesia</option>
                  <option value="SG">Singapore</option>
                  <option value="MY">Malaysia</option>
                  <option value="TH">Thailand</option>
                  <option value="VN">Vietnam</option>
                </select>
              </div>
              <div className="form-group">
                <label>Government ID Type</label>
                <select disabled>
                  <option value="">Select ID type</option>
                  <option value="passport">Passport</option>
                  <option value="national_id">National ID</option>
                  <option value="drivers_license">Driver's License</option>
                </select>
              </div>
              <div className="form-group">
                <label>Government ID Number</label>
                <input type="text" placeholder="Enter ID number" disabled />
              </div>
              <div className="form-group">
                <label>Upload ID Document</label>
                <div className="file-upload">
                  <input type="file" disabled />
                  <span className="upload-text">Upload front of ID</span>
                </div>
              </div>
              <div className="form-group">
                <label>Upload Proof of Address</label>
                <div className="file-upload">
                  <input type="file" disabled />
                  <span className="upload-text">Upload utility bill or bank statement</span>
                </div>
              </div>
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowKYCForm(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled>
                  Submit KYC (Locked in Testnet)
                </button>
              </div>
              <p className="form-note">
                🔒 All fields are disabled in testnet mode. 
                KYC will be enabled when Arc mainnet launches.
              </p>
            </form>
          </div>
        )}

        {kycStatus === 'pending' && (
          <div className="kyc-card pending">
            <div className="kyc-icon">⏳</div>
            <h4>KYC Verification Pending</h4>
            <p>
              Your KYC application is under review. 
              This typically takes 1-3 business days.
            </p>
            <div className="kyc-timeline">
              <div className="timeline-item completed">
                <span className="timeline-icon">✓</span>
                <span>Application Submitted</span>
              </div>
              <div className="timeline-item active">
                <span className="timeline-icon">⏳</span>
                <span>Document Verification</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-icon">○</span>
                <span>Identity Verification</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-icon">○</span>
                <span>Approval</span>
              </div>
            </div>
            <p className="kyc-note">
              ⚠️ This is a testnet simulation. 
              In production, you would receive email updates on your KYC status.
            </p>
          </div>
        )}

        {kycStatus === 'verified' && (
          <div className="kyc-card verified">
            <div className="kyc-icon">✅</div>
            <h4>KYC Verified</h4>
            <p>
              Your identity has been successfully verified. 
              You now have full access to {userType === 'employer' ? 'employer' : 'worker'} features.
            </p>
            <div className="verification-details">
              <div className="detail-item">
                <span className="detail-label">Verification Date:</span>
                <span className="detail-value">April 15, 2024</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Verification Level:</span>
                <span className="detail-value">Level 2 - Individual</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className="detail-value status-active">Active</span>
              </div>
            </div>
            <p className="kyc-note">
              ⚠️ This is a testnet simulation. 
              Your KYC status would be verified by a compliant KYC provider in production.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default KYCSection
