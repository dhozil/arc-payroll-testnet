// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title CompanyRegistry
 * @dev Registry for companies participating in the payroll system
 * Handles company registration, KYC verification, and status management
 */
contract CompanyRegistry is Ownable, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Company status
    enum CompanyStatus {
        Pending,        // Registration pending KYC verification
        Active,         // Active and verified
        Suspended,      // Suspended due to violations
        Inactive       // Deactivated by company
    }

    // Company structure
    struct Company {
        address companyAddress;
        string name;
        string legalId;        // Legal business ID/tax ID
        string country;
        string industry;
        uint256 registeredAt;
        uint256 verifiedAt;
        CompanyStatus status;
        uint256 totalWorkers;  // Number of registered workers
        uint256 totalPaid;     // Total USDC paid to workers
    }

    // State variables
    mapping(address => Company) public companies;
    EnumerableSet.AddressSet private companyAddresses;
    
    // KYC verification authority (can be updated by owner)
    address public kycVerifier;
    
    // Events
    event CompanyRegistered(
        address indexed companyAddress,
        string name,
        uint256 timestamp
    );

    // Individual getter functions to avoid BigInt serialization issues
    function getCompanyName(address _companyAddress) public view returns (string memory) {
        return companies[_companyAddress].name;
    }

    function getCompanyLegalId(address _companyAddress) public view returns (string memory) {
        return companies[_companyAddress].legalId;
    }

    function getCompanyCountry(address _companyAddress) public view returns (string memory) {
        return companies[_companyAddress].country;
    }

    function getCompanyIndustry(address _companyAddress) public view returns (string memory) {
        return companies[_companyAddress].industry;
    }

    function getCompanyRegisteredAt(address _companyAddress) public view returns (uint256) {
        return companies[_companyAddress].registeredAt;
    }

    function getCompanyStatus(address _companyAddress) public view returns (CompanyStatus) {
        return companies[_companyAddress].status;
    }

    function getCompanyTotalWorkers(address _companyAddress) public view returns (uint256) {
        return companies[_companyAddress].totalWorkers;
    }
    
    event CompanyVerified(
        address indexed companyAddress,
        uint256 timestamp
    );
    
    event CompanyStatusChanged(
        address indexed companyAddress,
        CompanyStatus oldStatus,
        CompanyStatus newStatus,
        uint256 timestamp
    );
    
    event CompanyUpdated(
        address indexed companyAddress,
        string name,
        string country,
        string industry,
        uint256 timestamp
    );
    
    event WorkerCountUpdated(
        address indexed companyAddress,
        uint256 newCount,
        uint256 timestamp
    );
    
    event TotalPaidUpdated(
        address indexed companyAddress,
        uint256 amount,
        uint256 timestamp
    );
    
    event KYCVerifierChanged(
        address indexed oldVerifier,
        address indexed newVerifier,
        uint256 timestamp
    );

    // Errors
    error CompanyAlreadyRegistered();
    error CompanyNotFound();
    error InvalidAddress();
    error NotAuthorized();
    error InvalidStatus();
    error NotKYCVerifier();
    error EmptyString();

    /**
     * @dev Constructor
     * @param _initialOwner Initial owner of the contract
     * @param _kycVerifier Initial KYC verifier address
     */
    constructor(address _initialOwner, address _kycVerifier) Ownable(_initialOwner) {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        kycVerifier = _kycVerifier;
    }

    /**
     * @dev Register a new company
     * @param _name Company name
     * @param _legalId Legal business ID/tax ID
     * @param _country Country of registration
     * @param _industry Industry sector
     */
    function registerCompany(
        string memory _name,
        string memory _legalId,
        string memory _country,
        string memory _industry
    ) external nonReentrant {
        if (bytes(_name).length == 0) revert EmptyString();
        if (bytes(_legalId).length == 0) revert EmptyString();
        if (companies[msg.sender].companyAddress != address(0)) {
            revert CompanyAlreadyRegistered();
        }

        companies[msg.sender] = Company({
            companyAddress: msg.sender,
            name: _name,
            legalId: _legalId,
            country: _country,
            industry: _industry,
            registeredAt: block.timestamp,
            verifiedAt: 0,
            status: CompanyStatus.Pending,
            totalWorkers: 0,
            totalPaid: 0
        });

        companyAddresses.add(msg.sender);

        emit CompanyRegistered(msg.sender, _name, block.timestamp);
    }

    /**
     * @dev Verify a company (KYC approved)
     * @param _companyAddress Address of the company to verify
     */
    function verifyCompany(address _companyAddress) external nonReentrant {
        if (msg.sender != kycVerifier) revert NotKYCVerifier();
        if (companies[_companyAddress].companyAddress == address(0)) {
            revert CompanyNotFound();
        }

        companies[_companyAddress].status = CompanyStatus.Active;
        companies[_companyAddress].verifiedAt = block.timestamp;

        emit CompanyVerified(_companyAddress, block.timestamp);
        emit CompanyStatusChanged(
            _companyAddress,
            CompanyStatus.Pending,
            CompanyStatus.Active,
            block.timestamp
        );
    }

    /**
     * @dev Update company information
     * @param _name New company name
     * @param _country New country
     * @param _industry New industry
     */
    function updateCompanyInfo(
        string memory _name,
        string memory _country,
        string memory _industry
    ) external nonReentrant {
        if (companies[msg.sender].companyAddress == address(0)) {
            revert CompanyNotFound();
        }
        if (bytes(_name).length == 0) revert EmptyString();

        companies[msg.sender].name = _name;
        companies[msg.sender].country = _country;
        companies[msg.sender].industry = _industry;

        emit CompanyUpdated(
            msg.sender,
            _name,
            _country,
            _industry,
            block.timestamp
        );
    }

    /**
     * @dev Change company status (only owner or KYC verifier)
     * @param _companyAddress Address of the company
     * @param _newStatus New status
     */
    function changeCompanyStatus(
        address _companyAddress,
        CompanyStatus _newStatus
    ) external nonReentrant {
        if (msg.sender != owner() && msg.sender != kycVerifier) {
            revert NotAuthorized();
        }
        if (companies[_companyAddress].companyAddress == address(0)) {
            revert CompanyNotFound();
        }

        CompanyStatus oldStatus = companies[_companyAddress].status;
        companies[_companyAddress].status = _newStatus;

        emit CompanyStatusChanged(
            _companyAddress,
            oldStatus,
            _newStatus,
            block.timestamp
        );
    }

    /**
     * @dev Update worker count for a company (called by PayrollContract)
     * @param _companyAddress Address of the company
     * @param _newCount New worker count
     */
    function updateWorkerCount(address _companyAddress, uint256 _newCount) external {
        if (companies[_companyAddress].companyAddress == address(0)) {
            revert CompanyNotFound();
        }
        companies[_companyAddress].totalWorkers = _newCount;

        emit WorkerCountUpdated(_companyAddress, _newCount, block.timestamp);
    }

    /**
     * @dev Update total paid amount for a company (called by PayrollContract)
     * @param _companyAddress Address of the company
     * @param _amount Amount paid
     */
    function updateTotalPaid(address _companyAddress, uint256 _amount) external {
        if (companies[_companyAddress].companyAddress == address(0)) {
            revert CompanyNotFound();
        }
        companies[_companyAddress].totalPaid += _amount;

        emit TotalPaidUpdated(_companyAddress, _amount, block.timestamp);
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
     * @dev Get company details
     * @param _companyAddress Address of the company
     */
    function getCompany(address _companyAddress) external view returns (Company memory) {
        if (companies[_companyAddress].companyAddress == address(0)) {
            revert CompanyNotFound();
        }
        return companies[_companyAddress];
    }

    /**
     * @dev Check if an address is a registered company
     * @param _companyAddress Address to check
     */
    function isCompany(address _companyAddress) external view returns (bool) {
        return companies[_companyAddress].companyAddress != address(0);
    }

    /**
     * @dev Check if a company is verified (active status)
     * @param _companyAddress Address to check
     */
    function isVerifiedCompany(address _companyAddress) external view returns (bool) {
        return companies[_companyAddress].companyAddress != address(0) &&
               companies[_companyAddress].status == CompanyStatus.Active;
    }

    /**
     * @dev Get total number of registered companies
     */
    function getTotalCompanies() external view returns (uint256) {
        return companyAddresses.length();
    }

    /**
     * @dev Get all registered company addresses
     */
    function getAllCompanyAddresses() external view returns (address[] memory) {
        uint256 length = companyAddresses.length();
        address[] memory addresses = new address[](length);
        
        for (uint256 i = 0; i < length; i++) {
            addresses[i] = companyAddresses.at(i);
        }
        
        return addresses;
    }

    /**
     * @dev Get companies by status
     * @param _status Status to filter by
     */
    function getCompaniesByStatus(CompanyStatus _status) external view returns (address[] memory) {
        uint256 length = companyAddresses.length();
        uint256 count = 0;
        
        // First pass: count matching companies
        for (uint256 i = 0; i < length; i++) {
            if (companies[companyAddresses.at(i)].status == _status) {
                count++;
            }
        }
        
        // Second pass: collect addresses
        address[] memory addresses = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < length; i++) {
            if (companies[companyAddresses.at(i)].status == _status) {
                addresses[index] = companyAddresses.at(i);
                index++;
            }
        }
        
        return addresses;
    }

    /**
     * @dev Get paginated list of companies
     * @param _offset Starting index
     * @param _limit Number of companies to return
     */
    function getPaginatedCompanies(uint256 _offset, uint256 _limit) external view returns (Company[] memory) {
        uint256 length = companyAddresses.length();
        if (_offset >= length) {
            return new Company[](0);
        }
        
        uint256 end = _offset + _limit;
        if (end > length) {
            end = length;
        }
        
        Company[] memory companyList = new Company[](end - _offset);
        uint256 index = 0;
        
        for (uint256 i = _offset; i < end; i++) {
            companyList[index] = companies[companyAddresses.at(i)];
            index++;
        }
        
        return companyList;
    }
}
