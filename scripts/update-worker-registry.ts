import { ethers } from 'hardhat'

async function main() {
  const [deployer] = await ethers.getSigners()

  console.log('Updating WorkerRegistry address in PayrollContract...')
  console.log('Deployer address:', deployer.address)

  const payrollContractAddress = '0x86A952eaC6578c444e7AE8d5BB71cF255f127149'
  const newWorkerRegistryAddress = '0x9382c74117482f5674aF2e4DD87515B1BD85dB1D'

  const PayrollContract = await ethers.getContractFactory('PayrollContract')
  const payrollContract = PayrollContract.attach(payrollContractAddress)

  const tx = await payrollContract.setWorkerRegistry(newWorkerRegistryAddress)
  console.log('Transaction submitted:', tx.hash)

  await tx.wait()
  console.log('WorkerRegistry address updated successfully!')

  const currentWorkerRegistry = await payrollContract.workerRegistry()
  console.log('New WorkerRegistry address:', currentWorkerRegistry)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
