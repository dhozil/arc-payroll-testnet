import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deployPayrollContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre
  const { deploy, get } = deployments
  const { deployer } = await getNamedAccounts()

  console.log('Deploying PayrollContract...')

  // Get USDC token address for the network
  const usdcAddress = hre.network.name === 'arcTestnet' 
    ? process.env.ARC_TESTNET_USDC || '0x3600000000000000000000000000000000000000'
    : process.env.ETHEREUM_SEPOLIA_USDC || '0x0000000000000000000000000000000000000000'

  // Get registry addresses
  const companyRegistry = await get('CompanyRegistry')
  const workerRegistry = await get('WorkerRegistry')

  console.log(`USDC Address: ${usdcAddress}`)
  console.log(`CompanyRegistry Address: ${companyRegistry.address}`)
  console.log(`WorkerRegistry Address: ${workerRegistry.address}`)

  const deployment = await deploy('PayrollContract', {
    from: deployer,
    args: [usdcAddress, companyRegistry.address, workerRegistry.address],
    log: true,
    waitConfirmations: hre.network.name === 'arcTestnet' ? 1 : 6,
  })

  console.log(`PayrollContract deployed to: ${deployment.address}`)

  // Verify the contract on block explorer (if supported)
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    try {
      await hre.run('verify:verify', {
        address: deployment.address,
        constructorArguments: [usdcAddress, companyRegistry.address, workerRegistry.address],
      })
      console.log('Contract verified successfully')
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        console.log('Contract is already verified')
      } else {
        console.error('Verification failed:', error.message)
      }
    }
  }
}

deployPayrollContract.tags = ['payroll', 'all']
deployPayrollContract.dependencies = ['company-registry', 'worker-registry']

export default deployPayrollContract
