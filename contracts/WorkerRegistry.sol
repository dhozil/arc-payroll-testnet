// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title WorkerRegistry
 * @dev Registry for workers participating in the payroll system
 * Handles worker registration, KYC verification, and salary management
 */
contract WorkerRegistry is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Worker status
    enum WorkerStatus {
        Pending,        // Registration pending KYC verification
        Active,         // Active and verified
        Suspended,      // Suspended due to violations
        Inactive       // Deactivated by worker
    }

    // Worker structure
    struct Worker {
        address workerAddress;
        string name;
        string email;
        string country;
        string currency;      // Preferred payout currency (e.g., "USD", "IDR")
        uint256 registeredAt;
        uint256 verifiedAt;
        WorkerStatus status;
        address employer;     // Current employer address
        uint256 salary;       // Current salary in USDC (6 decimals)
        uint256 totalEarned;  // Total USDC earned across all jobs
    }

    // State variables
    mapping(address => Worker) public workers;
    EnumerableSet.AddressSet private workerAddresses;
    
    // KYC verification authority (can be updated by owner)
    address public kycVerifier;
    
    // Company registry address (for verification)
    address public companyRegistry;

    // Events
    event WorkerRegistered(
        address indexed workerAddress,
        string name,
        uint256 timestamp
    );
    
    event WorkerVerified(
        address indexed workerAddress,
        uint256 timestamp
    );
    
    event WorkerStatusChanged(
        address indexed workerAddress,
        WorkerStatus oldStatus,
        WorkerStatus newStatus,
        uint256 timestamp
    );
    
    event WorkerUpdated(
        address indexed workerAddress,
        string name,
        string email,
        string country,
        string currency,
        uint256 timestamp
    );
    
    event EmployerAssigned(
        address indexed workerAddress,
        address indexed employer,
        uint256 salary,
        uint256 timestamp
    );
    
    event SalaryUpdated(
        address indexed workerAddress,
        uint256 oldSalary,
        uint256 newSalary,
        uint256 timestamp
    );
    
    event TotalEarnedUpdated(
        address indexed workerAddress,
        uint256 amount,
        uint256 timestamp
    );
    
    event KYCVerifierChanged(
        address indexed oldVerifier,
        address indexed newVerifier,
        uint256 timestamp
    );
    
    event CompanyRegistryChanged(
        address indexed oldRegistry,
        address indexed newRegistry,
        uint256 timestamp
    );

    // Errors
    error WorkerAlreadyRegistered();
    error WorkerNotFound();
    error InvalidAddress();
    error NotAuthorized();
    error InvalidStatus();
    error NotKYCVerifier();
    error EmptyString();
    error NotVerifiedCompany();

    /**
     * @dev Constructor
     * @param _initialOwner Initial owner of the contract
     * @param _kycVerifier Initial KYC verifier address
     * @param _companyRegistry Company registry contract address
     */
    constructor(
        address _initialOwner,
        address _kycVerifier,
        address _companyRegistry
    ) Ownable(_initialOwner) {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        kycVerifier = _kycVerifier;
        companyRegistry = _companyRegistry;
    }

    /**
     * @dev Register a new worker
     * @param _name Worker name
     * @param _email Worker email
     * @param _country Worker country
     * @param _currency Preferred payout currency
     */
    function registerWorker(
        string memory _name,
        string memory _email,
        string memory _country,
        string memory _currency
    ) external nonReentrant {
        if (bytes(_name).length == 0) revert EmptyString();
        if (bytes(_email).length == 0) revert EmptyString();
        if (workers[msg.sender].workerAddress != address(0)) {
            revert WorkerAlreadyRegistered();
        }

        workers[msg.sender] = Worker({
            workerAddress: msg.sender,
            name: _name,
            email: _email,
            country: _country,
            currency: _currency,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            status: WorkerStatus.Pending,
            employer: address(0),
            salary: 0,
            totalEarned: 0
        });

        workerAddresses.add(msg.sender);

        emit WorkerRegistered(msg.sender, _name, block.timestamp);
    }

    /**
     * @dev Verify a worker (KYC approved)
     * @param _workerAddress Address of the worker to verify
     */
    function verifyWorker(address _workerAddress) external nonReentrant {
        if (msg.sender != kycVerifier) revert NotKYCVerifier();
        if (workers[_workerAddress].workerAddress == address(0)) {
            revert WorkerNotFound();
        }

        workers[_workerAddress].status = WorkerStatus.Active;
        workers[_workerAddress].verifiedAt = block.timestamp;

        emit WorkerVerified(_workerAddress, block.timestamp);
        emit WorkerStatusChanged(
            _workerAddress,
            WorkerStatus.Pending,
            WorkerStatus.Active,
            block.timestamp
        );
    }

    /**
     * @dev Update worker information
     * @param _name New name
     * @param _email New email
     * @param _country New country
     * @param _currency New currency
     */
    function updateWorkerInfo(
        string memory _name,
        string memory _email,
        string memory _country,
        string memory _currency
    ) external nonReentrant {
        if (workers[msg.sender].workerAddress == address(0)) {
            revert WorkerNotFound();
        }
        if (bytes(_name).length == 0) revert EmptyString();

        workers[msg.sender].name = _name;
        workers[msg.sender].email = _email;
        workers[msg.sender].country = _country;
        workers[msg.sender].currency = _currency;

        emit WorkerUpdated(
            msg.sender,
            _name,
            _email,
            _country,
            _currency,
            block.timestamp
        );
    }

    /**
     * @dev Assign worker to an employer (called by employer or system)
     * @param _workerAddress Address of the worker
     * @param _employer Address of the employer
     * @param _salary Salary in USDC (6 decimals)
     */
    function assignEmployer(
        address _workerAddress,
        address _employer,
        uint256 _salary
    ) external nonReentrant {
        if (workers[_workerAddress].workerAddress == address(0)) {
            revert WorkerNotFound();
        }
        
        // Verify employer is registered company
        if (companyRegistry != address(0)) {
            (bool success, bytes memory data) = companyRegistry.staticcall(
                abi.encodeWithSignature("isVerifiedCompany(address)", _employer)
            );
            if (success && data.length > 0) {
                bool isVerified = abi.decode(data, (bool));
                if (!isVerified) revert NotVerifiedCompany();
            }
        }

        workers[_workerAddress].employer = _employer;
        workers[_workerAddress].salary = _salary;

        emit EmployerAssigned(_workerAddress, _employer, _salary, block.timestamp);
    }

    /**
     * @dev Update worker salary
     * @param _workerAddress Address of the worker
     * @param _newSalary New salary in USDC (6 decimals)
     */
    function updateSalary(address _workerAddress, uint256 _newSalary) external nonReentrant {
        if (workers[_workerAddress].workerAddress == address(0)) {
            revert WorkerNotFound();
        }
        
        // Only employer or worker can update salary
        if (msg.sender != workers[_workerAddress].employer && msg.sender != _workerAddress) {
            revert NotAuthorized();
        }

        uint256 oldSalary = workers[_workerAddress].salary;
        workers[_workerAddress].salary = _newSalary;

        emit SalaryUpdated(_workerAddress, oldSalary, _newSalary, block.timestamp);
    }

    /**
     * @dev Change worker status (only owner or KYC verifier)
     * @param _workerAddress Address of the worker
     * @param _newStatus New status
     */
    function changeWorkerStatus(
        address _workerAddress,
        WorkerStatus _newStatus
    ) external nonReentrant {
        if (msg.sender != owner() && msg.sender != kycVerifier) {
            revert NotAuthorized();
        }
        if (workers[_workerAddress].workerAddress == address(0)) {
            revert WorkerNotFound();
        }

        WorkerStatus oldStatus = workers[_workerAddress].status;
        workers[_workerAddress].status = _newStatus;

        emit WorkerStatusChanged(
            _workerAddress,
            oldStatus,
            _newStatus,
            block.timestamp
        );
    }

    /**
     * @dev Update total earned amount for a worker (called by PayrollContract)
     * @param _workerAddress Address of the worker
     * @param _amount Amount earned
     */
    function updateTotalEarned(address _workerAddress, uint256 _amount) external {
        if (workers[_workerAddress].workerAddress == address(0)) {
            revert WorkerNotFound();
        }
        workers[_workerAddress].totalEarned += _amount;

        emit TotalEarnedUpdated(_workerAddress, _amount, block.timestamp);
    }

    /**
     * @dev Set new KYC verifier (only owner)
     * @param _newVerifier New verifier address
     */
    function setKYCVerifier(address _newVerifier) external onlyOwner {
        if (_newVerifier == address(0)) revert InvalidAddress();
        address oldVerifier = kycVerifier;
        kycVerifier = _newVerifier;

        emit KYCVerifierChanged(oldVerifier, _newVerifier, block.timestamp);
    }

    /**
     * @dev Set company registry address (only owner)
     * @param _companyRegistry New company registry address
     */
    function setCompanyRegistry(address _companyRegistry) external onlyOwner {
        if (_companyRegistry == address(0)) revert InvalidAddress();
        address oldRegistry = companyRegistry;
        companyRegistry = _companyRegistry;

        emit CompanyRegistryChanged(oldRegistry, _companyRegistry, block.timestamp);
    }

    /**
     * @dev Get worker details
     * @param _workerAddress Address of the worker
     */
    function getWorker(address _workerAddress) external view returns (Worker memory) {
        if (workers[_workerAddress].workerAddress == address(0)) {
            revert WorkerNotFound();
        }
        return workers[_workerAddress];
    }

    /**
     * @dev Check if an address is a registered worker
     * @param _workerAddress Address to check
     */
    function isWorker(address _workerAddress) external view returns (bool) {
        return workers[_workerAddress].workerAddress != address(0);
    }

    /**
     * @dev Check if a worker is verified (active status)
     * @param _workerAddress Address to check
     */
    function isVerifiedWorker(address _workerAddress) external view returns (bool) {
        return workers[_workerAddress].workerAddress != address(0) &&
               workers[_workerAddress].status == WorkerStatus.Active;
    }

    /**
     * @dev Get workers by employer
     * @param _employer Address of the employer
     */
    function getWorkersByEmployer(address _employer) external view returns (address[] memory) {
        uint256 length = workerAddresses.length();
        uint256 count = 0;
        
        // First pass: count matching workers
        for (uint256 i = 0; i < length; i++) {
            if (workers[workerAddresses.at(i)].employer == _employer) {
                count++;
            }
        }
        
        // Second pass: collect addresses
        address[] memory addresses = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < length; i++) {
            if (workers[workerAddresses.at(i)].employer == _employer) {
                addresses[index] = workerAddresses.at(i);
                index++;
            }
        }
        
        return addresses;
    }

    /**
     * @dev Get workers by status
     * @param _status Status to filter by
     */
    function getWorkersByStatus(WorkerStatus _status) external view returns (address[] memory) {
        uint256 length = workerAddresses.length();
        uint256 count = 0;
        
        // First pass: count matching workers
        for (uint256 i = 0; i < length; i++) {
            if (workers[workerAddresses.at(i)].status == _status) {
                count++;
            }
        }
        
        // Second pass: collect addresses
        address[] memory addresses = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < length; i++) {
            if (workers[workerAddresses.at(i)].status == _status) {
                addresses[index] = workerAddresses.at(i);
                index++;
            }
        }
        
        return addresses;
    }

    /**
     * @dev Get total number of registered workers
     */
    function getTotalWorkers() external view returns (uint256) {
        return workerAddresses.length();
    }

    /**
     * @dev Get all registered worker addresses
     */
    function getAllWorkerAddresses() external view returns (address[] memory) {
        uint256 length = workerAddresses.length();
        address[] memory addresses = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            addresses[i] = workerAddresses.at(i);
        }
        
        return addresses;
    }

    /**
     * @dev Get paginated list of workers
     * @param _offset Starting index
     * @param _limit Number of workers to return
     */
    function getPaginatedWorkers(uint256 _offset, uint256 _limit) external view returns (Worker[] memory) {
        uint256 length = workerAddresses.length();
        if (_offset >= length) {
            return new Worker[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > length) {
            end = length;
        }
        
        Worker[] memory workerList = new Worker[](end - _offset);
        uint256 index = 0;
        
        for (uint256 i = _offset; i < end; i++) {
            workerList[index] = workers[workerAddresses.at(i)];
            index++;
        }
        
        return workerList;
    }
}
