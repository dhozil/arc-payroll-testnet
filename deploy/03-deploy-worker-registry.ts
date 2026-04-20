import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deployWorkerRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts()
  const { deploy, get, log } = hre.deployments

  log('Deploying WorkerRegistry...')

  // Get CompanyRegistry address
  const companyRegistry = await get('CompanyRegistry')
  const companyRegistryAddress = companyRegistry.address

  // Deploy WorkerRegistry
  const workerRegistry = await deploy('WorkerRegistry', {
    from: deployer,
    args: [deployer, deployer, companyRegistryAddress], // initialOwner, kycVerifier, companyRegistry
    log: true,
    waitConfirmations: 1,
  })

  log(`WorkerRegistry deployed to: ${workerRegistry.address}`)
  log(`CompanyRegistry address: ${companyRegistryAddress}`)

  // Verify on Etherscan/ArcScan if needed
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    try {
      await hre.run('verify:verify', {
        address: workerRegistry.address,
        constructorArguments: [deployer, deployer, companyRegistryAddress],
      })
      log('WorkerRegistry verified!')
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        log('WorkerRegistry already verified!')
      } else {
        log(`Verification failed: ${error.message}`)
      }
    }
  }

  log('----------------------------------------------------')
}

deployWorkerRegistry.tags = ['worker-registry', 'all']
deployWorkerRegistry.dependencies = ['company-registry']

export default deployWorkerRegistry
