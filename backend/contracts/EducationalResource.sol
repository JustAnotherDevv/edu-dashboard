// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title LearningPoints
 * @dev ERC20 token for learning achievements and rewards
 */
contract LearningPoints is ERC20, AccessControl {
    bytes32 public constant EDUCATOR_ROLE = keccak256("EDUCATOR_ROLE");
    
    constructor() ERC20("Learning Points", "LEARN") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function awardPoints(address student, uint256 amount) external onlyRole(EDUCATOR_ROLE) {
        _mint(student, amount);
    }
}

/**
 * @title AcademicCredential
 * @dev ERC721 token representing academic achievements and certifications
 */
contract AcademicCredential is ERC721, AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant EDUCATOR_ROLE = keccak256("EDUCATOR_ROLE");
    Counters.Counter private _tokenIds;
    
    struct Credential {
        string courseName;
        string achievement;
        uint256 timestamp;
        uint256 score;
    }
    
    mapping(uint256 => Credential) public credentials;
    
    constructor() ERC721("Academic Credential", "ACRED") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function awardCredential(
        address student,
        string memory courseName,
        string memory achievement,
        uint256 score
    ) external onlyRole(EDUCATOR_ROLE) returns (uint256) {
        _tokenIds.increment();
        uint256 newCredentialId = _tokenIds.current();
        
        _mint(student, newCredentialId);
        credentials[newCredentialId] = Credential(
            courseName,
            achievement,
            block.timestamp,
            score
        );
        
        return newCredentialId;
    }
}

/**
 * @title CourseManager
 * @dev Manages course content, enrollments, and assignments
 */
contract CourseManager is AccessControl {
    bytes32 public constant EDUCATOR_ROLE = keccak256("EDUCATOR_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");
    
    struct Course {
        string name;
        string description;
        address educator;
        uint256 maxStudents;
        uint256 enrolledCount;
        uint256 startDate;
        uint256 endDate;
        bool isActive;
    }
    
    struct Assignment {
        string title;
        string description;
        uint256 maxScore;
        uint256 dueDate;
        bool isActive;
    }
    
    struct Submission {
        address student;
        string contentHash;
        uint256 timestamp;
        uint256 score;
        bool isGraded;
    }
    
    mapping(uint256 => Course) public courses;
    mapping(uint256 => mapping(uint256 => Assignment)) public courseAssignments;
    mapping(uint256 => mapping(uint256 => mapping(address => Submission))) public submissions;
    mapping(uint256 => mapping(address => bool)) public enrollments;
    
    uint256 public courseCount;
    uint256 public assignmentCount;
    
    LearningPoints public learningPoints;
    AcademicCredential public academicCredential;
    
    event CourseCreated(uint256 courseId, string name, address educator);
    event AssignmentCreated(uint256 courseId, uint256 assignmentId, string title);
    event AssignmentSubmitted(uint256 courseId, uint256 assignmentId, address student);
    event AssignmentGraded(uint256 courseId, uint256 assignmentId, address student, uint256 score);
    event StudentEnrolled(uint256 courseId, address student);
    
    constructor(address _learningPoints, address _academicCredential) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        learningPoints = LearningPoints(_learningPoints);
        academicCredential = AcademicCredential(_academicCredential);
    }
    
    function createCourse(
        string memory name,
        string memory description,
        uint256 maxStudents,
        uint256 startDate,
        uint256 endDate
    ) external onlyRole(EDUCATOR_ROLE) returns (uint256) {
        courseCount++;
        courses[courseCount] = Course(
            name,
            description,
            msg.sender,
            maxStudents,
            0,
            startDate,
            endDate,
            true
        );
        
        emit CourseCreated(courseCount, name, msg.sender);
        return courseCount;
    }
    
    function createAssignment(
        uint256 courseId,
        string memory title,
        string memory description,
        uint256 maxScore,
        uint256 dueDate
    ) external onlyRole(EDUCATOR_ROLE) {
        require(courses[courseId].educator == msg.sender, "Not course educator");
        
        assignmentCount++;
        courseAssignments[courseId][assignmentCount] = Assignment(
            title,
            description,
            maxScore,
            dueDate,
            true
        );
        
        emit AssignmentCreated(courseId, assignmentCount, title);
    }
    
    function enrollStudent(uint256 courseId) external {
        Course storage course = courses[courseId];
        require(course.isActive, "Course not active");
        require(course.enrolledCount < course.maxStudents, "Course full");
        require(!enrollments[courseId][msg.sender], "Already enrolled");
        require(block.timestamp < course.endDate, "Course ended");
        
        enrollments[courseId][msg.sender] = true;
        course.enrolledCount++;
        _grantRole(STUDENT_ROLE, msg.sender);
        
        emit StudentEnrolled(courseId, msg.sender);
    }
    
    function submitAssignment(
        uint256 courseId,
        uint256 assignmentId,
        string memory contentHash
    ) external onlyRole(STUDENT_ROLE) {
        require(enrollments[courseId][msg.sender], "Not enrolled");
        Assignment storage assignment = courseAssignments[courseId][assignmentId];
        require(assignment.isActive, "Assignment not active");
        require(block.timestamp <= assignment.dueDate, "Assignment overdue");
        
        submissions[courseId][assignmentId][msg.sender] = Submission(
            msg.sender,
            contentHash,
            block.timestamp,
            0,
            false
        );
        
        emit AssignmentSubmitted(courseId, assignmentId, msg.sender);
    }
    
    function gradeAssignment(
        uint256 courseId,
        uint256 assignmentId,
        address student,
        uint256 score
    ) external onlyRole(EDUCATOR_ROLE) {
        require(courses[courseId].educator == msg.sender, "Not course educator");
        Assignment storage assignment = courseAssignments[courseId][assignmentId];
        require(score <= assignment.maxScore, "Score exceeds maximum");
        
        Submission storage submission = submissions[courseId][assignmentId][student];
        require(!submission.isGraded, "Already graded");
        
        submission.score = score;
        submission.isGraded = true;
        
        // Award learning points based on score percentage
        uint256 pointsEarned = (score * 100) / assignment.maxScore;
        learningPoints.awardPoints(student, pointsEarned);
        
        emit AssignmentGraded(courseId, assignmentId, student, score);
        
        // Award credential if course is completed
        checkCourseCompletion(courseId, student);
    }
    
    function checkCourseCompletion(uint256 courseId, address student) internal {
        Course storage course = courses[courseId];
        uint256 totalScore = 0;
        uint256 assignmentCount = 0;
        
        for (uint256 i = 1; i <= assignmentCount; i++) {
            if (courseAssignments[courseId][i].isActive) {
                Submission storage submission = submissions[courseId][i][student];
                if (submission.isGraded) {
                    totalScore += submission.score;
                    assignmentCount++;
                }
            }
        }
        
        if (assignmentCount > 0) {
            uint256 averageScore = totalScore / assignmentCount;
            if (averageScore >= 70) { // Passing grade threshold
                academicCredential.awardCredential(
                    student,
                    course.name,
                    "Course Completion",
                    averageScore
                );
            }
        }
    }
}

/**
 * @title PeerReview
 * @dev Manages peer review system for assignments
 */
contract PeerReview is AccessControl {
    bytes32 public constant EDUCATOR_ROLE = keccak256("EDUCATOR_ROLE");
    bytes32 public constant STUDENT_ROLE = keccak256("STUDENT_ROLE");
    
    struct Review {
        address reviewer;
        string feedback;
        uint256 score;
        uint256 timestamp;
    }
    
    mapping(uint256 => mapping(uint256 => mapping(address => Review[]))) public reviews;
    mapping(uint256 => mapping(uint256 => mapping(address => uint256))) public reviewsCount;
    
    uint256 public constant REVIEWS_REQUIRED = 3;
    uint256 public constant MIN_SCORE = 0;
    uint256 public constant MAX_SCORE = 100;
    
    event ReviewSubmitted(uint256 courseId, uint256 assignmentId, address submission, address reviewer);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    function submitReview(
        uint256 courseId,
        uint256 assignmentId,
        address submissionAddress,
        string memory feedback,
        uint256 score
    ) external onlyRole(STUDENT_ROLE) {
        require(score >= MIN_SCORE && score <= MAX_SCORE, "Invalid score range");
        require(submissionAddress != msg.sender, "Cannot review own submission");
        require(reviewsCount[courseId][assignmentId][submissionAddress] < REVIEWS_REQUIRED, "Max reviews reached");
        
        Review memory review = Review(
            msg.sender,
            feedback,
            score,
            block.timestamp
        );
        
        reviews[courseId][assignmentId][submissionAddress].push(review);
        reviewsCount[courseId][assignmentId][submissionAddress]++;
        
        emit ReviewSubmitted(courseId, assignmentId, submissionAddress, msg.sender);
    }
    
    function getReviews(
        uint256 courseId,
        uint256 assignmentId,
        address submissionAddress
    ) external view returns (Review[] memory) {
        return reviews[courseId][assignmentId][submissionAddress];
    }
    
    function getAverageScore(
        uint256 courseId,
        uint256 assignmentId,
        address submissionAddress
    ) external view returns (uint256) {
        Review[] storage submissionReviews = reviews[courseId][assignmentId][submissionAddress];
        if (submissionReviews.length == 0) return 0;
        
        uint256 totalScore = 0;
        for (uint256 i = 0; i < submissionReviews.length; i++) {
            totalScore += submissionReviews[i].score;
        }
        
        return totalScore / submissionReviews.length;
    }
}