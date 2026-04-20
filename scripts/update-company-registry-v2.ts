import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Updating CompanyRegistry address in PayrollContract...')
  console.log('Deployer address:', deployer.address)

  const payrollContractAddress = '0xB686fE473Ae388D84B6a7A2B14432aB654F9ccA7'
  const newCompanyRegistryAddress = '0x49196Ba5944f7EE6c28F518293951316DC30fb35'

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
