import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'

const deployCompanyRegistry: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts()
  const { deploy, log } = hre.deployments

  log('Deploying CompanyRegistry...')

  // Deploy CompanyRegistry
  const companyRegistry = await deploy('CompanyRegistry', {
    from: deployer,
    args: [deployer, deployer], // initialOwner = deployer, kycVerifier = deployer (can be changed later)
    log: true,
    waitConfirmations: 1,
  })

  log(`CompanyRegistry deployed to: ${companyRegistry.address}`)

  // Verify on Etherscan/ArcScan if needed
  if (hre.network.name !== 'hardhat' && hre.network.name !== 'localhost') {
    try {
      await hre.run('verify:verify', {
        address: companyRegistry.address,
        constructorArguments: [deployer, deployer],
      })
      log('CompanyRegistry verified!')
    } catch (error: any) {
      if (error.message.includes('Already Verified')) {
        log('CompanyRegistry already verified!')
      } else {
        log(`Verification failed: ${error.message}`)
      }
    }
  }

  log('----------------------------------------------------')
}

export default deployCompanyRegistry

deployCompanyRegistry.tags = ['company-registry', 'all']
