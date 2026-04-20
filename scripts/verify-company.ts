import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Verifying company...')
  console.log('Deployer address:', deployer.address)

  const companyRegistryAddress = '0x1CfE5f3c534E3b7F8A58195E59eBcF17345dfFa1'
  const companyToVerify = '0x0266feb4337e7faf71e668745e9eaeaf26bb31ea'

  const CompanyRegistry = await ethers.getContractFactory('CompanyRegistry')
  const companyRegistry = CompanyRegistry.attach(companyRegistryAddress)

  const tx = await companyRegistry.verifyCompany(companyToVerify)
  console.log('Transaction submitted:', tx.hash)

  await tx.wait()
  console.log('Company verified successfully!')

  const companyData = await companyRegistry.getCompany(companyToVerify)
  console.log('Company status:', companyData.status)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
