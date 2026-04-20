import { useState } from 'react'
import { WalletProvider, useWallet } from './contexts/WalletContext'
import WalletConnect from './components/WalletConnect'
import EmployerDashboard from './components/EmployerDashboard'
import WorkerDashboard from './components/WorkerDashboard'
import { Building2, User, Shield, Zap, Globe } from 'lucide-react'
import './App.css'

function LandingPage() {
  const { connect } = useWallet()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_600px_600px_at_50%_50%,black,transparent)]"></div>
      
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-[30%] left-[30%] w-[400px] h-[400px] bg-pink-600/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto text-center relative z-10">
        {/* Logo and badge */}
        <div className="mb-16 animate-fadeIn">
          <div className="inline-flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-[70px] h-[70px] rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 shadow-2xl animate-scaleIn relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
              <Globe className="w-9 h-9 text-white relative z-10" />
            </div>
            
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm font-medium text-primary">Powered by Arc Blockchain</span>
            </div>
          </div>
        </div>

        {/* Hero text */}
        <div className="mb-20 animate-slideIn" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-8 leading-tight tracking-tight">
            Arc Payroll
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              System
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl lg:text-3xl text-slate-400 mb-6 max-w-4xl mx-auto leading-relaxed font-light">
            The Future of Decentralized Payroll Management
          </p>
          
          <p className="text-lg text-slate-500 max-w-3xl mx-auto leading-relaxed">
            Secure, fast, and global payroll solutions built on the Arc blockchain. 
            Automate payments, manage escrow, and ensure transparency with smart contracts.
          </p>
        </div>

        {/* Stats/Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 max-w-5xl mx-auto animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-blue-500/50 transition-all duration-500 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-2 text-white">100%</h3>
            <p className="text-base text-slate-400 font-medium">Secure & Transparent</p>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-purple-500/50 transition-all duration-500 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-2 text-white">&lt;1s</h3>
            <p className="text-base text-slate-400 font-medium">Transaction Speed</p>
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 hover:border-pink-500/50 transition-all duration-500 group">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-pink-600 mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Globe className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-3xl font-bold mb-2 text-white">180+</h3>
            <p className="text-base text-slate-400 font-medium">Countries Supported</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.6s' }}>
          <button 
            onClick={connect}
            className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 text-white px-16 py-6 rounded-2xl font-bold text-xl transition-all duration-300 shadow-2xl hover:shadow-[0_0_60px_rgba(99,102,241,0.5)] transform hover:-translate-y-2 hover:scale-105 relative overflow-hidden group"
          >
            <span className="relative z-10">Connect Wallet to Get Started</span>
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          <div className="mt-8 flex items-center justify-center gap-8 text-sm text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>No registration required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>Gas-optimized contracts</span>
            </div>
          </div>
        </div>

        {/* Testnet Notice */}
        <div className="mt-12 animate-fadeIn" style={{ animationDelay: '0.8s' }}>
          <p className="text-sm text-slate-500 font-medium">
            ⚠️ TESTNET MODE - For Testing Only
          </p>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { isConnected } = useWallet()
  const [currentView, setCurrentView] = useState<'employer' | 'worker'>('employer')

  if (!isConnected) {
    return <LandingPage />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="border-b border-border bg-card/50 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Arc Payroll System
              </h1>
              <p className="text-xs text-muted-foreground mt-1">⚠️ TESTNET MODE - For Testing Only</p>
            </div>
            <WalletConnect />
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 py-3">
            <button
              onClick={() => setCurrentView('employer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'employer'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Employer Dashboard
            </button>
            <button
              onClick={() => setCurrentView('worker')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentView === 'worker'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
              }`}
            >
              <User className="w-4 h-4" />
              Worker Dashboard
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-8">
        {currentView === 'employer' ? <EmployerDashboard /> : <WorkerDashboard />}
      </main>
    </div>
  )
}

function App() {
  return (
    <WalletProvider>
      <AppContent />
    </WalletProvider>
  )
}

export default App
