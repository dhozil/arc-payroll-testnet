// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PayrollContract
 * @dev Handles payroll payments with escrow and batch payment functionality
 * Integrates with CompanyRegistry and WorkerRegistry for verification
 */
contract PayrollContract is Ownable, ReentrancyGuard {
    IERC20 public usdcToken;
    address public companyRegistry;
    address public workerRegistry;
    
    struct Payment {
        uint256 id;
        address worker;
        uint256 amount;
        uint256 timestamp;
        bool isReleased;
        bool isEscrowed;
        address employer;
        uint256 escrowReleaseTime;
    }
    
    mapping(uint256 => Payment) public payments;
    
    uint256 public paymentCounter;
    uint256 public defaultEscrowTime = 7 days; // 7 days default escrow period
    
    // Events
    event PaymentCreated(uint256 indexed paymentId, address indexed worker, uint256 amount, bool useEscrow);
    event PaymentReleased(uint256 indexed paymentId, address indexed worker, uint256 amount);
    event PaymentEscrowed(uint256 indexed paymentId, uint256 releaseTime);
    event BatchPaymentCreated(uint256[] paymentIds, address indexed employer, uint256 totalAmount);
    event CompanyRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event WorkerRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event EscrowTimeUpdated(uint256 oldTime, uint256 newTime);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    // Errors
    error InvalidAddress();
    error NotAuthorized();
    error WorkerNotVerified();
    error CompanyNotVerified();
    error AmountZero();
    error PaymentNotFound();
    error PaymentAlreadyReleased();
    error EscrowNotOver();
    error ArraysLengthMismatch();
    error TransferFailed();
    error RegistryNotSet();

    /**
     * @dev Constructor
     * @param _usdcToken USDC token address
     * @param _companyRegistry Company registry contract address
     * @param _workerRegistry Worker registry contract address
     */
    constructor(
        address _usdcToken,
        address _companyRegistry,
        address _workerRegistry
    ) Ownable(msg.sender) {
        if (_usdcToken == address(0)) revert InvalidAddress();
        usdcToken = IERC20(_usdcToken);
        companyRegistry = _companyRegistry;
        workerRegistry = _workerRegistry;
    }

    /**
     * @dev Modifier to check if sender is a verified company
     */
    modifier onlyVerifiedCompany() {
        if (companyRegistry != address(0)) {
            (bool success, bytes memory data) = companyRegistry.staticcall(
                abi.encodeWithSignature("isVerifiedCompany(address)", msg.sender)
            );
            if (success && data.length > 0) {
                bool isVerified = abi.decode(data, (bool));
                if (!isVerified) revert NotAuthorized();
            } else {
                revert NotAuthorized();
            }
        } else {
            revert NotAuthorized();
        }
        _;
    }

    /**
     * @dev Modifier to check if worker is verified
     */
    modifier onlyVerifiedWorker(address _worker) {
        if (workerRegistry != address(0)) {
            (bool success, bytes memory data) = workerRegistry.staticcall(
                abi.encodeWithSignature("isVerifiedWorker(address)", _worker)
            );
            if (success && data.length > 0) {
                bool isVerified = abi.decode(data, (bool));
                if (!isVerified) revert WorkerNotVerified();
            } else {
                revert WorkerNotVerified();
            }
        } else {
            revert WorkerNotVerified();
        }
        _;
    }

    /**
     * @dev Set company registry address (only owner)
     * @param _companyRegistry New company registry address
     */
    function setCompanyRegistry(address _companyRegistry) external onlyOwner {
        if (_companyRegistry == address(0)) revert InvalidAddress();
        address oldRegistry = companyRegistry;
        companyRegistry = _companyRegistry;
        emit CompanyRegistryUpdated(oldRegistry, _companyRegistry);
    }

    /**
     * @dev Set worker registry address (only owner)
     * @param _workerRegistry New worker registry address
     */
    function setWorkerRegistry(address _workerRegistry) external onlyOwner {
        if (_workerRegistry == address(0)) revert InvalidAddress();
        address oldRegistry = workerRegistry;
        workerRegistry = _workerRegistry;
        emit WorkerRegistryUpdated(oldRegistry, _workerRegistry);
    }

    /**
     * @dev Set default escrow time (only owner)
     * @param _escrowTime New escrow time in seconds
     */
    function setEscrowTime(uint256 _escrowTime) external onlyOwner {
        uint256 oldTime = defaultEscrowTime;
        defaultEscrowTime = _escrowTime;
        emit EscrowTimeUpdated(oldTime, _escrowTime);
    }

    /**
     * @dev Create a single payment
     * @param _worker Worker address
     * @param _amount Amount in USDC (6 decimals)
     * @param _useEscrow Whether to use escrow
     * @param _customEscrowTime Custom escrow time (0 = use default)
     */
    function createPayment(
        address _worker,
        uint256 _amount,
        bool _useEscrow,
        uint256 _customEscrowTime
    ) external onlyVerifiedCompany nonReentrant returns (uint256) {
        if (_amount == 0) revert AmountZero();
        if (workerRegistry == address(0)) revert RegistryNotSet();

        // Verify worker is KYC verified
        (bool success, bytes memory data) = workerRegistry.staticcall(
            abi.encodeWithSignature("isVerifiedWorker(address)", _worker)
        );
        if (!success || data.length == 0 || !abi.decode(data, (bool))) {
            revert WorkerNotVerified();
        }

        // Transfer USDC from employer to contract
        bool transferSuccess = usdcToken.transferFrom(msg.sender, address(this), _amount);
        if (!transferSuccess) revert TransferFailed();

        paymentCounter++;
        uint256 escrowReleaseTime = _useEscrow 
            ? (_customEscrowTime > 0 ? _customEscrowTime : block.timestamp + defaultEscrowTime)
            : 0;

        payments[paymentCounter] = Payment({
            id: paymentCounter,
            worker: _worker,
            amount: _amount,
            timestamp: block.timestamp,
            isReleased: false,
            isEscrowed: _useEscrow,
            employer: msg.sender,
            escrowReleaseTime: escrowReleaseTime
        });

        if (_useEscrow) {
            emit PaymentEscrowed(paymentCounter, escrowReleaseTime);
        }

        emit PaymentCreated(paymentCounter, _worker, _amount, _useEscrow);
        return paymentCounter;
    }

    /**
     * @dev Create batch payments
     * @param _workers Array of worker addresses
     * @param _amounts Array of amounts (must match workers array length)
     * @param _useEscrow Whether to use escrow for all payments
     */
    function batchCreatePayments(
        address[] calldata _workers,
        uint256[] calldata _amounts,
        bool _useEscrow
    ) external onlyVerifiedCompany nonReentrant returns (uint256[] memory) {
        if (_workers.length != _amounts.length) revert ArraysLengthMismatch();
        if (_workers.length == 0) revert AmountZero();
        if (workerRegistry == address(0)) revert RegistryNotSet();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            if (_amounts[i] == 0) revert AmountZero();
            totalAmount += _amounts[i];
        }

        // Transfer USDC from employer to contract
        bool transferSuccess = usdcToken.transferFrom(msg.sender, address(this), totalAmount);
        if (!transferSuccess) revert TransferFailed();

        uint256[] memory paymentIds = new uint256[](_workers.length);
        uint256 escrowReleaseTime = _useEscrow ? block.timestamp + defaultEscrowTime : 0;

        for (uint256 i = 0; i < _workers.length; i++) {
            // Verify worker exists
            (bool success, bytes memory data) = workerRegistry.staticcall(
                abi.encodeWithSignature("isWorker(address)", _workers[i])
            );
            if (!success || data.length == 0 || !abi.decode(data, (bool))) {
                revert WorkerNotVerified();
            }

            paymentCounter++;
            payments[paymentCounter] = Payment({
                id: paymentCounter,
                worker: _workers[i],
                amount: _amounts[i],
                timestamp: block.timestamp,
                isReleased: false,
                isEscrowed: _useEscrow,
                employer: msg.sender,
                escrowReleaseTime: escrowReleaseTime
            });

            paymentIds[i] = paymentCounter;
            emit PaymentCreated(paymentCounter, _workers[i], _amounts[i], _useEscrow);

            if (_useEscrow) {
                emit PaymentEscrowed(paymentCounter, escrowReleaseTime);
            }
        }

        emit BatchPaymentCreated(paymentIds, msg.sender, totalAmount);
        return paymentIds;
    }

    /**
     * @dev Release payment to worker
     * @param _paymentId Payment ID to release
     */
    function releasePayment(uint256 _paymentId) external nonReentrant {
        Payment storage payment = payments[_paymentId];
        if (payment.id == 0) revert PaymentNotFound();
        if (payment.isReleased) revert PaymentAlreadyReleased();

        if (payment.isEscrowed) {
            // Check if worker is KYC verified
            (bool success, bytes memory data) = workerRegistry.staticcall(
                abi.encodeWithSignature("isVerifiedWorker(address)", payment.worker)
            );
            if (!success || data.length == 0 || !abi.decode(data, (bool))) {
                revert WorkerNotVerified();
            }

            // Check escrow period
            if (block.timestamp < payment.escrowReleaseTime) {
                revert EscrowNotOver();
            }
        }

        payment.isReleased = true;

        // Update worker's total earned in registry
        if (workerRegistry != address(0)) {
            (bool registrySuccess, ) = workerRegistry.call(
                abi.encodeWithSignature("updateTotalEarned(address,uint256)", payment.worker, payment.amount)
            );
            // Don't revert if registry call fails, just log
        }

        // Update employer's total paid in registry
        if (companyRegistry != address(0)) {
            (bool registrySuccess, ) = companyRegistry.call(
                abi.encodeWithSignature("updateTotalPaid(address,uint256)", payment.employer, payment.amount)
            );
            // Don't revert if registry call fails, just log
        }

        bool transferSuccess = usdcToken.transfer(payment.worker, payment.amount);
        if (!transferSuccess) revert TransferFailed();

        emit PaymentReleased(_paymentId, payment.worker, payment.amount);
    }

    /**
     * @dev Get payment details
     * @param _paymentId Payment ID
     */
    function getPayment(uint256 _paymentId) external view returns (Payment memory) {
        if (payments[_paymentId].id == 0) revert PaymentNotFound();
        return payments[_paymentId];
    }

    /**
     * @dev Get all payments for a worker
     * @param _worker Worker address
     */
    function getWorkerPayments(address _worker) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= paymentCounter; i++) {
            if (payments[i].worker == _worker) {
                count++;
            }
        }

        uint256[] memory workerPayments = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= paymentCounter; i++) {
            if (payments[i].worker == _worker) {
                workerPayments[index] = i;
                index++;
            }
        }

        return workerPayments;
    }

    /**
     * @dev Get all payments for an employer
     * @param _employer Employer address
     */
    function getEmployerPayments(address _employer) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= paymentCounter; i++) {
            if (payments[i].employer == _employer) {
                count++;
            }
        }

        uint256[] memory employerPayments = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= paymentCounter; i++) {
            if (payments[i].employer == _employer) {
                employerPayments[index] = i;
                index++;
            }
        }

        return employerPayments;
    }

    /**
     * @dev Get pending payments for a worker
     * @param _worker Worker address
     */
    function getPendingPayments(address _worker) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 1; i <= paymentCounter; i++) {
            if (payments[i].worker == _worker && !payments[i].isReleased) {
                count++;
            }
        }

        uint256[] memory pendingPayments = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 1; i <= paymentCounter; i++) {
            if (payments[i].worker == _worker && !payments[i].isReleased) {
                pendingPayments[index] = i;
                index++;
            }
        }

        return pendingPayments;
    }

    /**
     * @dev Emergency withdraw funds (only owner)
     * @param _amount Amount to withdraw
     * @param _to Address to send funds to
     */
    function emergencyWithdraw(uint256 _amount, address _to) external onlyOwner {
        if (_to == address(0)) revert InvalidAddress();
        bool transferSuccess = usdcToken.transfer(_to, _amount);
        if (!transferSuccess) revert TransferFailed();
        emit EmergencyWithdraw(_to, _amount);
    }

    /**
     * @dev Get total contract balance
     */
    function getContractBalance() external view returns (uint256) {
        return usdcToken.balanceOf(address(this));
    }
}
