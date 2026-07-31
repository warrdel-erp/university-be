export const region = ["Othan than Rajasthan", "Rajasthan"];

export const additionalCategory = ["OBC(Creamy layer)", "OBC(Non-Creamy layer)"];

export const religion = ["Bodh", "Christian", "Hindu", "Jain", "Muslim", "Sikh"];

export const caste = [
  "DEC ST EMPL WARD",
  "General",
  "GENERAL(MINORITY)",
  "Jain Minority",
  "Mart/Ex-Serviceman Ward",
  "minor",
  "Muslim",
  "Muslim Minority",
  "OBC",
  "Other",
  "Physical Handicap",
  "SC",
  "ST",
  "Widow",
];

export const feePlan = ["B.ARCH 2018-2023(2018-2019)", "HOSTEL FEE 2018-2023(2018-2019)"];

export const feeCategory = ["General", "LEET", "Reap"];

export const feeSession = [
  "2000-2001",
  "2001-2002",
  "2002-2003",
  "2003-2004",
  "2004-2005",
  "2005-2006",
  "2006-2007",
  "2007-2008",
  "2008-2009",
  "2009-2010",
  "2010-2011",
  "2011-2012",
  "2012-2013",
  "2013-2014",
  "2014-2015",
  "2015-2016",
  "2016-2017",
  "2017-2018",
  "2018-2019",
  "2019-2020",
];

export const specializationMinor = ["ID", "UD"];

export const courseMedium = ["ENG"];

export const specialization = ["ID", "UD"];

export const studentHouseId = ["ADR", "APK", "CC", "LB"];

export const consultant = [
  "GLOBAL COMPUTECH Jaipur",
  "PN ASSOCIATES",
  "R K. ENGINEERING WORKS",
  "PAL ASSOCIATES",
  "FALGUNI ENTERPRISES",
  "ALLIED SALES AGENCIES",
  "B.M. INFOTRADE PVT. LTD.",
  "O.R. AGENCY",
  "FRONTLINE SOLUTIONS",
  "O.B.M. ELECTRONICS & TECHNOLOGY LTD.",
  "AMAZON",
  "LG ELECTRONICS INDIA PVT. LTD",
  "SKYMECH ENGINEERS PVT. LTD.",
  "AGAON ELECTRONICS",
  "R.K. JOINERY (PVT) LTD",
];

export const gender = ["Male", "Female", "Transgender", "Other"];

export const bloodGroup = ["A(-)", "A(+)", "AB(-)", "AB(+)", "B(-)", "B(+)", "O(-)", "O(+)"];

export const formSession = [
  "2000-2001",
  "2001-2002",
  "2002-2003",
  "2003-2004",
  "2004-2005",
  "2005-2006",
  "2006-2007",
  "2007-2008",
  "2008-2009",
  "2009-2010",
  "2010-2011",
  "2011-2012",
  "2012-2013",
  "2013-2014",
  "2014-2015",
  "2015-2016",
  "2016-2017",
  "2017-2018",
  "2018-2019",
  "2019-2020",
  "2020-2021",
  "2021-2022",
  "2022-2023",
  "2023-2024",
  "2024-2025",
  "2025-2026",
  "2026-2027",
  "2027-2028",
  "2028-2029",
  "2029-2030",
];

export const documentStatus = ["Pending Documents", "Complete Documents"];

export const counselor = ["Brijesh", "Shahi Prakash"];

export const registerClass = [
  "B.ARCH SEM 1A",
  "B.ARCH SEM 1B",
  "B.ARCH SEM 1C",
  "B.ARCH SEM 2A",
  "B.ARCH SEM 2B",
  "B.ARCH SEM 2C",
];

export const courseOpted = ["B.Arch.", "B.Des.", "CE", "CSE", "ECE", "EEE", "IT", "M.Arch.", "ME"];

export const curricularActivity = ["ABC", "DEF", "GEF", "HIJ"];

export const istExam = ["Delhi", "Gurugram"];

export const iindExam = ["Noida", "Jaipur"];

export const studentAdmissionStatus = ["Migrate Student", "Bridge Student", "New Admission"];

export const nationality = ["Indian"];

export const shift = ["Morning", "Evening", "AfterNoon"];

export const country = ["INDIA", "USA"];

export const state = ["RAJASTHAN", "HARYANA", "Punjab"];

export const city = ["JAIPUR", "KOTA", "KOTPUTLI", "REWARI", "GURUGRAM"];

/** Matches students.student_status ENUM (see extend-student-status-enum migration) */
export const STUDENT_STATUS_OPTIONS = [
  { label: "Cancel Student", value: "Cancel Student" },
  { label: "Left Student", value: "Left Student" },
  { label: "Long Absent", value: "Long Absent" },
  { label: "Non Attendant", value: "Non Attendant" },
  { label: "Active", value: "active" },
  { label: "Deactive", value: "deactive" },
  { label: "Transferred", value: "transferred" },
  { label: "Graduated", value: "graduated" },
];

export const STUDENT_STATUS_VALUES = STUDENT_STATUS_OPTIONS.map((o) => o.value);

export const STUDENT_CANCELLATION_STATUSES = [
  "Cancel Student",
  "Left Student",
  "Long Absent",
  "Non Attendant",
  "active",
  "deactive",
  "transferred",
  "graduated",
];

export const studentStatus = STUDENT_STATUS_VALUES;

export const admissionCategory = ["11A", "11B", "11C"];

export const appointmentType = ["Permanent", "Regular", "Regular(Tenure)", "Temporary", "Visiting"];

export const employeeGroup = ["ADMINISTRAATION", "NON-TEACHING", "TEACHING"];

export const salutation = ["Mr", "Ms", "Mrs"];

export const maritalStatus = ["Single", "Married", "Widowed", "Divorced"];

export const jobStatus = ["Current"];

export const experienceType = ["ACADEMIC", "FUEL(DIESEL)", "PETROL", "PROFESSIONAL"];

export const achievementCategory = ["AA", "BB"];

export const Document = ["10th", "12th", "Graduation", "Post Graduation"];

export const nomineeRelation = ["Aunt", "Brother", "Father", "Mother", "Sister", "Uncle"];

export const itCategory = ["INCOME TAX"];

export const buildingTypes = ["Academics", "Residential"];

export const departmentTypes = ["Admin", "Academic"];

export const departmentPositionHeadStatuses = ["ACTIVE", "INACTIVE"];

export const governanceBodyCategories = [
  "Authority",
  "Board",
  "Committee",
  "Council",
  "Cell",
  "Task Force",
  "Working Group",
];

export const governanceBodyStatuses = ["Active", "Inactive", "Dissolved"];

export const SUBJECT_TYPES = [
  "Core",
  "Elective",
  "Open Elective",
  "Department Elective",
  "Foundation",
  "Skill Enhancement",
  "Ability Enhancement",
  "Value Added",
  "Internship",
  "Dissertation",
  "Audit",
];

export const SUBJECT_CATEGORIES = [
  "Theory",
  "Practical",
  "Lab",
  "Project",
  "Seminar",
  "Workshop",
];

export const questionStatus = ["Pending", "Approved", "Rejected"];

export const questionTypes = {
  MCQ: "mcq",
  THEORY: "theory",
  THEORY_CHOICE: "theoryChoice",
};

export const feeTypeLedgerTypes = ["Account Receivable", "Account Payable"];

export const assetStatuses = ["ISSUED", "IN_STOCK", "MAINTANANCE"];

export const assetConditions = ["GOOD", "FAIR", "EXCELLENT", "BAD"];

export const assetInventoryStatuses = ["NOT_ASSIGNED", "ASSIGNED"];

export const amcContractTypes = [
  "COMPREHENSIVE_AMC",
  "NON_COMPREHENSIVE_AMC",
  "WARRANTY_AMC",
  "PREVENTIVE_MAINTENANCE",
  "ON_DEMAND_SERVICE",
];

export const amcSlaResponseHours = [2, 6, 12, 24, 48,72];

export const amcSlaResolutionHours = [6, 12, 24, 48, 72];

export const amcContractStatuses = ["ACTIVE", "NEAR_EXPIRY", "EXPIRED"];

export const amcContractApprovalStatuses = ["DRAFT", "PUBLISHED", "APPROVED"];

export const amcPaymentTerms = ["ANNUAL_UPFRONT", "QUARTERLY", "MONTHLY"];

export const amcServiceVisitFrequencies = ["MONTHLY", "QUARTERLY", "ANNUALLY"];

export const serviceTicketIssueTypes = ["HARDWARE", "SOFTWARE"];

export const serviceTicketPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const serviceTicketStatuses = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
];
export const FEE_PLAN_PUBLISH_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published",
};

export const LOW_STOCK_THRESHOLD = 2;

export const ATTENDANCE_STATUS = [
  "Present",
  "Absent",
  "Medical Leave",
  "Duty Leave",
  "Sports Leave",
  "NCC Leave",
  "Approved Leave",
  "Holiday",
];

/** Statuses that count as present for attendance percentage / counts */
export const ATTENDANCE_PRESENT_STATUSES = [
  "Present",
  "Medical Leave",
  "Duty Leave",
  "Sports Leave",
  "NCC Leave",
  "Approved Leave",
];

/** Excluded from present/absent calculations */
export const ATTENDANCE_IGNORED_STATUSES = ["Holiday"];

/** Academic group formation enums */
export const ACADEMIC_GROUP_TYPES = ["teaching", "activity"];
export const ACADEMIC_GROUP_SELECTION_SCOPES = ["program_specific", "cross_program"];
export const ACADEMIC_GROUP_CONTEXT_TYPES = ["course", "activity", "none"];
export const ACADEMIC_GROUP_PUBLISH_STATUSES = ["draft", "published"];
export const ACADEMIC_GROUP_USER_ROLES = [
  "primary_faculty",
  "co_faculty",
  "supervisor",
  "mentor",
  "external_faculty",
  "evaluator",
];

/** Assessment Category Constants */
export const ASSESSMENT_CATEGORIES = [
  "EXAMINATION",
  "CONTINUOUS_ASSESSMENT",
  "PRACTICAL_EVALUATION",
  "PROJECT_RESEARCH_EVALUATION",
  "PARTICIPATION_ENGAGEMENT",
];

export const ASSESSMENT_CATEGORY_DETAILS = {
  EXAMINATION: {
    category: "Examination",
    purpose: "Scheduled formal assessments",
    subCategories: ["Mid Term", "End Term", "Supplementary Exam"],
  },
  CONTINUOUS_ASSESSMENT: {
    category: "Continuous Assessment",
    purpose: "Ongoing academic evaluation",
    subCategories: ["Assignment", "Quiz", "Presentation", "Test"],
  },
  PRACTICAL_EVALUATION: {
    category: "Practical Evaluation",
    purpose: "Hands-on skill evaluation",
    subCategories: ["Lab", "Practical", "Studio Work", "Viva"],
  },
  PROJECT_RESEARCH_EVALUATION: {
    category: "Project & Research Evaluation",
    purpose: "Long-duration academic work",
    subCategories: ["Dissertation", "Thesis", "Capstone Project", "Internship"],
  },
  PARTICIPATION_ENGAGEMENT: {
    category: "Participation & Engagement",
    purpose: "Non-exam contribution",
    subCategories: ["Attendance", "Seminar Participation", "Classroom Activity"],
  },
};

export const ASSESSMENT_SUB_CATEGORIES = [
  "Mid Term",
  "End Term",
  "Supplementary Exam",
  "Assignment",
  "Quiz",
  "Presentation",
  "Test",
  "Lab",
  "Practical",
  "Studio Work",
  "Viva",
  "Dissertation",
  "Thesis",
  "Capstone Project",
  "Internship",
  "Attendance",
  "Seminar Participation",
  "Classroom Activity",
];

export const EVALUATION_PATTERNS = [
  "INTERNAL_EXTERNAL",
  "INTERNAL_ONLY",
  "EXTERNAL_ONLY",
];

export const MANDATORY_COMPONENTS = [
  "THEORY",
  "PRACTICAL",
  "VIVA",
  "PROJECT",
  "INTERNSHIP",
];

export const TIE_BREAKING_METHODS = [
  "HIGHER_CGPA",
  "HIGHER_SGPA",
  "HIGHER_INTERNAL_MARKS",
  "HIGHER_EXTERNAL_MARKS",
  "ALPHABETICAL",
  "RANDOM",
];

export const GRACE_APPLICABLE_TO = [
  "OVERALL",
  "EXTERNAL",
  "INTERNAL",
];

export const PROMOTION_METHODS = [
  "YEAR_WISE",
  "SEMESTER_WISE",
  "TERM_WISE",
];

export const IMPROVEMENT_MARKS_CONSIDERED = [
  "HIGHEST",
  "LATEST",
];
