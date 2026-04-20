# Arc Payroll System - Decentralized Payroll Management on Arc Testnet

A comprehensive decentralized payroll management system built on Arc Network testnet. This project enables employers to manage cross-border payroll payments securely and efficiently using smart contracts, with full KYC verification integration and real-time payment tracking.

## 🚀 Features

### Landing Page
- Modern, premium design with animated backgrounds
- Gradient color scheme and glassmorphism effects
- Feature cards highlighting key benefits
- Clear call-to-action for wallet connection
- Fully responsive design

### Employer Dashboard
- **Company Registration**: Register company with legal ID, country, and industry
- **Company Profile**: View and edit company information
- **Worker Management**: Add, edit, and manage worker profiles
- **Payment System**: 
  - Create individual payments
  - Batch payment creation for multiple workers
  - USDC approval flow for transactions
  - Gas fee estimation before transactions
  - Payment history tracking
- **KYC Verification Warning**: Display verification status requirements
- **Analytics Dashboard**: View payment statistics and metrics

### Worker Dashboard
- **Worker Registration**: Register with employer selection
- **Worker Profile**: View and edit personal information
- **Payment Management**:
  - View payment history
  - Release pending payments
  - Track payment status
- **Currency Exchange**: 
  - Real-time exchange rates from API
  - USDC to local currency conversion (IDR, SGD, MYR, THB, EURC)
- **Bank Account Integration**: Manage withdrawal bank accounts
- **Transaction History**: Track all on-chain transactions

### Smart Contracts
- **CompanyRegistry**: 
  - Company registration and management
  - KYC verification status tracking
  - Individual getter functions for data retrieval
  - Custom error handling
- **WorkerRegistry**:
  - Worker registration with employer association
  - KYC verification status tracking
  - Individual getter functions
  - Custom error handling
- **PayrollContract**:
  - Batch payment creation
  - Escrow functionality with custom time settings
  - Payment release mechanism
  - Worker and company verification checks
  - Custom error handling
  - Integration with both registries

### UI/UX Features
- **Modern Design**: Tailwind CSS with custom design tokens
- **Responsive Layout**: Mobile-friendly interface
- **Animations**: Smooth transitions and hover effects
- **Icons**: Lucide React icon library
- **Dark Theme**: Professional dark color scheme
- **Glassmorphism**: Modern card designs with backdrop blur

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5.4.21
- **Styling**: Tailwind CSS 3.4.0
- **Icons**: Lucide React
- **Animations**: Custom CSS animations
- **State Management**: React Context API
- **Local Storage**: Browser localStorage for data persistence

### Blockchain & Web3
- **Network**: Arc Network Testnet
- **Smart Contracts**: Solidity 0.8.20
- **Deployment**: Hardhat 2.19.0 with hardhat-deploy
- **Web3 Library**: Viem 2.48.1
- **Security**: OpenZeppelin Contracts 5.6.1
- **RPC**: Arc Testnet RPC

### Development Tools
- **Language**: TypeScript 5.3.0
- **Package Manager**: npm
- **PostCSS**: PostCSS 8.5.10 with autoprefixer
- **Linting**: ESLint (optional)

## 📋 Prerequisites

- Node.js v18+ installed
- npm or yarn package manager
- Wallet with Arc testnet funds
- Basic understanding of blockchain and smart contracts
- Git for version control

## 🚀 Installation

### 1. Clone the Repository
```bash
git clone <repository-url>
cd arc-payroll-testnet
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Arc Testnet Configuration
VITE_ARC_TESTNET_RPC=https://rpc.testnet.arc.network
VITE_ARC_TESTNET_CHAIN_ID=5042002

# Smart Contract Addresses (after deployment)
VITE_COMPANY_REGISTRY_ADDRESS=0x...
VITE_WORKER_REGISTRY_ADDRESS=0x...
VITE_PAYROLL_CONTRACT_ADDRESS=0x...
VITE_USDC_ADDRESS=0x...

# Smart Contract Deployment
PRIVATE_KEY=your_private_key_here
ARC_TESTNET_USDC=0x...
ARC_API_KEY=your_arc_api_key
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 📜 Smart Contract Deployment

### Compile Contracts
```bash
npx hardhat compile
```

### Deploy to Arc Testnet
```bash
npx hardhat deploy --network arcTestnet
```

### Deployment Scripts
- `deploy/01-deploy-company-registry.ts` - Deploy CompanyRegistry
- `deploy/02-deploy-worker-registry.ts` - Deploy WorkerRegistry
- `deploy/03-deploy-payroll-contract.ts` - Deploy PayrollContract

### Contract Addresses
After deployment, update your `.env` file with the deployed contract addresses:
- `VITE_COMPANY_REGISTRY_ADDRESS` - CompanyRegistry contract address
- `VITE_WORKER_REGISTRY_ADDRESS` - WorkerRegistry contract address
- `VITE_PAYROLL_CONTRACT_ADDRESS` - PayrollContract contract address

## 📁 Project Structure

```
arc-payroll-testnet/
├── contracts/
│   ├── CompanyRegistry.sol          # Company registration contract
│   ├── WorkerRegistry.sol          # Worker registration contract
│   └── PayrollContract.sol          # Main payroll contract
├── deploy/
│   ├── 01-deploy-company-registry.ts
│   ├── 02-deploy-worker-registry.ts
│   └── 03-deploy-payroll-contract.ts
├── ignition/
│   └── modules/                     # Ignition deployment modules
├── scripts/
│   └── (utility scripts)
├── src/
│   ├── components/
│   │   ├── CompanyProfile.tsx       # Company profile component
│   │   ├── CompanyRegistration.tsx  # Company registration
│   │   ├── EmployerDashboard.tsx    # Employer dashboard
│   │   ├── WorkerProfile.tsx        # Worker profile component
│   │   ├── WorkerRegistration.tsx   # Worker registration
│   │   ├── WorkerDashboard.tsx      # Worker dashboard
│   │   ├── KYCSection.tsx           # KYC verification UI
│   │   ├── WalletConnect.tsx        # Wallet connection
│   │   ├── ExchangeMenu.tsx         # Currency exchange
│   │   ├── BankAccountIntegration.tsx # Bank account mgmt
│   │   └── AnalyticsDashboard.tsx   # Analytics component
│   ├── contexts/
│   │   └── WalletContext.tsx         # Wallet state management
│   ├── utils/
│   │   └── contracts.ts             # Contract ABIs and addresses
│   ├── App.tsx                      # Main app component
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Global styles
├── hardhat.config.ts                # Hardhat configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── .env.example
├── .env
└── README.md
```

## 🔧 Smart Contract Features

### CompanyRegistry
- Register companies with legal ID, country, and industry
- Update company information
- Check company registration status
- KYC verification status tracking
- Individual getter functions for all company data
- Custom errors: CompanyNotFound, InvalidStatus, NotAuthorized, InvalidAddress, CompanyAlreadyRegistered, EmptyString

### WorkerRegistry
- Register workers with employer association
- Update worker information
- Check worker registration status
- KYC verification status tracking
- Individual getter functions for all worker data
- Custom errors: WorkerAlreadyRegistered, WorkerNotFound, InvalidAddress, NotAuthorized, InvalidStatus, NotKYCVerifier, EmptyString, NotVerifiedCompany

### PayrollContract
- Create individual payments with optional escrow
- Batch payment creation for multiple workers
- Release payments to workers
- Payment history tracking by worker and employer
- Escrow functionality with custom release times
- Integration with CompanyRegistry and WorkerRegistry
- Verification checks for companies and workers
- Custom errors: InvalidAddress, NotAuthorized, WorkerNotVerified, CompanyNotVerified, AmountZero, PaymentNotFound, PaymentAlreadyReleased, EscrowNotOver, ArraysLengthMismatch, TransferFailed, RegistryNotSet

## 💡 Usage Guide

### For Employers

1. **Connect Wallet**: Click "Connect Wallet" on the landing page
2. **Register Company**: Fill in company details (name, legal ID, country, industry)
3. **Add Workers**: Register workers by adding their wallet addresses and details
4. **Create Payments**: 
   - Select workers to pay
   - Enter payment amounts
   - Optionally enable escrow with custom time
   - Approve USDC spending
   - Submit payment transaction
5. **Track Payments**: View payment history and status in the dashboard

### For Workers

1. **Connect Wallet**: Click "Connect Wallet" on the landing page
2. **Register**: Fill in personal details and select employer
3. **View Payments**: Check payment history in the dashboard
4. **Release Payments**: Click "Release" on pending payments to receive funds
5. **Exchange Currency**: Use the exchange menu to convert USDC to local currency
6. **Withdraw**: Add bank account details and withdraw funds

## 🔒 Security Considerations

- **Testnet Only**: This application runs on Arc testnet - no real funds are used
- **KYC Verification**: KYC status is tracked on-chain for compliance
- **Access Control**: Only verified companies can make payments to verified workers
- **Escrow System**: Optional escrow holds payments until verification or time expiry
- **Gas Estimation**: Users can estimate gas fees before transactions
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🧪 Testing

### Manual Testing
1. Deploy contracts to Arc testnet
2. Update `.env` with contract addresses
3. Start development server
4. Test employer flow: register company → add workers → create payments
5. Test worker flow: register → receive payments → release payments
6. Test exchange and withdrawal features

### Smart Contract Testing
```bash
npx hardhat test
```

## 📊 Current Status

✅ **Completed:**
- Project structure with TypeScript and Vite
- Tailwind CSS integration with modern design
- Landing page with premium design
- Company registration and profile management
- Worker registration and profile management
- Employer dashboard with payment system
- Worker dashboard with payment tracking
- Smart contracts (CompanyRegistry, WorkerRegistry, PayrollContract)
- Contract deployment to Arc testnet
- Real-time exchange rate integration
- Bank account integration UI
- KYC verification UI (display only)
- Analytics dashboard
- Gas fee estimation
- Transaction history
- Export data functionality (CSV/PDF)
- Custom escrow time input
- Responsive design
- Animations and transitions

🔄 **In Progress:**
- None

⏳ **Future Enhancements:**
- Production KYC provider integration
- Multi-currency support beyond USDC
- Advanced analytics and reporting
- Mobile app development
- Mainnet deployment preparation

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - For educational and testing purposes only

## 🔗 Resources

- [Arc Documentation](https://docs.arc.network/)
- [Arc Testnet RPC](https://rpc.testnet.arc.network)
- [Arc Discord](https://discord.com/invite/buildonarc)
- [Arc Twitter](https://x.com/arc)
- [Hardhat Documentation](https://hardhat.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Documentation](https://react.dev/)

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Join the Arc Discord community
- Contact the development team

## 🙏 Acknowledgments

- Arc Network for the testnet infrastructure
- OpenZeppelin for secure smart contract libraries
- Viem for the excellent Web3 library
- Tailwind CSS for the utility-first CSS framework
- Lucide for the beautiful icon library
