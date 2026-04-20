import { useState } from 'react'
import { useWallet } from '../contexts/WalletContext'
import './BankAccountIntegration.css'

interface BankAccount {
  id: string
  bankName: string
  accountNumber: string
  accountHolder: string
  country: string
  currency: string
  isDefault: boolean
}

function BankAccountIntegration() {
  const { isConnected } = useWallet()
  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAccount, setNewAccount] = useState({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    country: 'Indonesia',
    currency: 'IDR'
  })
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    
    const account: BankAccount = {
      id: Date.now().toString(),
      ...newAccount,
      isDefault: accounts.length === 0
    }
    
    setAccounts([...accounts, account])
    setNewAccount({
      bankName: '',
      accountNumber: '',
      accountHolder: '',
      country: 'Indonesia',
      currency: 'IDR'
    })
    setShowAddForm(false)
    
    alert('⚠️ TESTNET: Bank account added (simulation)')
  }

  const handleWithdraw = () => {
    if (!isConnected) {
      alert('Please connect your wallet first')
      return
    }

    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    const account = accounts.find(a => a.id === selectedAccount)
    
    alert(`⚠️ TESTNET: Withdrawal simulation\n\nAmount: ${withdrawAmount} USDC\nTo: ${account?.bankName} - ${account?.accountNumber}\n\nIn production, this would:\n1. Convert USDC to ${account?.currency}\n2. Transfer to bank account via on/off ramp\n3. Send confirmation email`)
    
    setWithdrawAmount('')
  }

  const setDefaultAccount = (id: string) => {
    setAccounts(accounts.map(acc => ({
      ...acc,
      isDefault: acc.id === id
    })))
  }

  const deleteAccount = (id: string) => {
    setAccounts(accounts.filter(acc => acc.id !== id))
  }

  return (
    <div className="bank-account-integration">
      <div className="bank-header">
        <h3>🏦 Bank Accounts</h3>
        <p className="subtitle">Manage your withdrawal accounts</p>
      </div>

      {!isConnected ? (
        <div className="connect-prompt">
          <p>Connect your wallet to manage bank accounts</p>
        </div>
      ) : (
        <div className="bank-content">
          <div className="bank-accounts-list">
            {accounts.length === 0 ? (
              <div className="empty-state">
                <p>No bank accounts added yet</p>
                <p className="empty-subtitle">Add a bank account to enable withdrawals</p>
              </div>
            ) : (
              accounts.map(account => (
                <div key={account.id} className="bank-account-card">
                  <div className="account-header">
                    <div className="bank-info">
                      <span className="bank-name">{account.bankName}</span>
                      {account.isDefault && <span className="default-badge">Default</span>}
                    </div>
                    <div className="account-actions">
                      {!account.isDefault && (
                        <button
                          className="btn btn-small"
                          onClick={() => setDefaultAccount(account.id)}
                        >
                          Set Default
                        </button>
                      )}
                      <button
                        className="btn btn-small btn-danger"
                        onClick={() => deleteAccount(account.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="account-details">
                    <div className="detail-row">
                      <span className="label">Account Number:</span>
                      <span className="value">{account.accountNumber}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Account Holder:</span>
                      <span className="value">{account.accountHolder}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Country:</span>
                      <span className="value">{account.country}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Currency:</span>
                      <span className="value">{account.currency}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <button 
            className="btn btn-secondary add-account-btn"
            onClick={() => setShowAddForm(true)}
          >
            + Add Bank Account
          </button>

          {showAddForm && (
            <div className="add-account-form">
              <h4>Add New Bank Account</h4>
              <form onSubmit={handleAddAccount}>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g., BCA, Mandiri, DBS"
                    value={newAccount.bankName}
                    onChange={(e) => setNewAccount({...newAccount, bankName: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    placeholder="Enter account number"
                    value={newAccount.accountNumber}
                    onChange={(e) => setNewAccount({...newAccount, accountNumber: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Account Holder Name</label>
                  <input
                    type="text"
                    placeholder="Enter account holder name"
                    value={newAccount.accountHolder}
                    onChange={(e) => setNewAccount({...newAccount, accountHolder: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <select
                    value={newAccount.country}
                    onChange={(e) => setNewAccount({...newAccount, country: e.target.value})}
                  >
                    <option value="Indonesia">Indonesia</option>
                    <option value="Singapore">Singapore</option>
                    <option value="Malaysia">Malaysia</option>
                    <option value="Thailand">Thailand</option>
                    <option value="Vietnam">Vietnam</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select
                    value={newAccount.currency}
                    onChange={(e) => setNewAccount({...newAccount, currency: e.target.value})}
                  >
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="MYR">MYR - Malaysian Ringgit</option>
                    <option value="THB">THB - Thai Baht</option>
                    <option value="VND">VND - Vietnamese Dong</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Add Account
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="withdrawal-section">
            <h4>Withdraw to Bank</h4>
            <div className="withdrawal-form">
              <div className="form-group">
                <label>Select Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                >
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.bankName} - {account.accountNumber} {account.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Amount (USDC)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary withdraw-btn"
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0}
              >
                Withdraw
              </button>
              <p className="withdrawal-note">
                ⚠️ TESTNET: Withdrawal is simulated. In production, this would integrate with on/off ramp providers like Circle, Transak, or local payment gateways.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BankAccountIntegration
