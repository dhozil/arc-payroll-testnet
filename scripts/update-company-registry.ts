import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Updating CompanyRegistry address in PayrollContract...')
  console.log('Deployer address:', deployer.address)

  const payrollContractAddress = '0x86A952eaC6578c444e7AE8d5BB71cF255f127149'
  const newCompanyRegistryAddress = '0x1CfE5f3c534E3b7F8A58195E59eBcF17345dfFa1'

  const PayrollContract = await ethers.getContractFactory('PayrollContract')
  const payrollContract = PayrollContract.attach(payrollContractAddress)

  const tx = await payrollContract.setCompanyRegistry(newCompanyRegistryAddress)
  console.log('Transaction submitted:', tx.hash)

  await tx.wait()
  console.log('CompanyRegistry address updated successfully!')

  const currentCompanyRegistry = await payrollContract.companyRegistry()
  console.log('New CompanyRegistry address:', currentCompanyRegistry)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
