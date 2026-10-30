# Elective Pool & Course Mapping APIs

Postman collection: `docs/postman/univ-v2-elective-pool.postman_collection.json`

This module provides complete support for:
1. **Elective Pool (Image 1)**: Reusable course pools for elective requirements with configurable scopes (`institute`, `programme` [default], `batch`), status toggling, and full CRUD.
2. **Elective Pool Subject Mapping (Image 2)**: Selecting courses from the institution's Course Master (`subject`), filtering by programme/components, dynamic `"Already in Pool"` vs `"Available"` status, bulk adding courses, viewing mapped courses, and removing mapped courses.

| | |
|---|---|
| **Auth** | Bearer Token / Cookie (`accessToken={{token}}`) Required |
| **Base URL** | `{{baseurl}}` (default `http://localhost:8080`) |
| **Mount Paths** | `/electivePool`, `/api/elective-pools` |

### Headers (all endpoints)

| Header | Required | Description |
|---|---|---|
| Authorization | Yes | `Bearer {{token}}` |
| Cookie | Optional | `accessToken={{token}}` |
| Content-Type | Yes (for POST/PATCH/PUT) | `application/json` |
| Accept | Yes | `application/json` |

---

## Database Tables

### 1. `elective_pool`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique Pool ID |
| `name` | VARCHAR(150) | NOT NULL | Pool Name (e.g., "Architecture Professional Electives") |
| `code` | VARCHAR(50) | NOT NULL, UNIQUE | Pool Code (e.g., "ARCH-PROF") |
| `description` | VARCHAR(300) | NULL | Optional description (max 300 chars) |
| `scope` | ENUM('institute', 'programme', 'batch') | NOT NULL, DEFAULT 'programme' | Scope level |
| `course_id` | INT | NULL, FK `course(course_id)` | Programme ID (required when scope is programme or batch) |
| `batch_id` | INT | NULL, FK `batch(batch_id)` | Batch ID (required when scope is batch) |
| `institute_id` | INT | NOT NULL, FK `institute(institute_id)` | Institute ID |
| `university_id` | INT | NULL | University ID |
| `campus_id` | INT | NULL | Campus ID |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status: Active / Inactive |
| `created_by` | INT | NULL | Created by user ID |
| `updated_by` | INT | NULL | Updated by user ID |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Updated timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

### 2. `elective_pool_subject_mapping`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Mapping record ID |
| `elective_pool_id` | INT | NOT NULL, FK `elective_pool(id)` ON DELETE CASCADE | Elective Pool ID |
| `subject_id` | INT | NOT NULL, FK `subject(subject_id)` ON DELETE RESTRICT | Subject ID from Course Master |
| `created_by` | INT | NULL | User ID who mapped the course |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Updated timestamp |
| *UNIQUE KEY* | `(elective_pool_id, subject_id)` | UNIQUE | Ensures no duplicate course in same pool |

---


### 3. `curriculum_elective_requirement` (Image 3)

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique Requirement ID |
| `curriculum_id` | INT | NOT NULL, FK `curriculum(curriculum_id)` | Curriculum ID |
| `term` | INT | NOT NULL | Term/Semester number |
| `requirement_code` | VARCHAR(50) | NOT NULL | Requirement Code (e.g. "PE-1", "OE-1") |
| `requirement_name` | VARCHAR(150) | NOT NULL | Title (e.g. "Professional Elective I") |
| `curriculum_category_id` | INT | NOT NULL, FK `curriculum_category(id)` | Category ID |
| `course_count` | BOOLEAN | NOT NULL, DEFAULT TRUE | Boolean flag for course count mode |
| `courses_required` | INT | NOT NULL, DEFAULT 1 | Number of courses required |
| `min_credits` | FLOAT | NULL (Optional) | Minimum credits required |
| `elective_pool_id` | INT | NOT NULL, FK `elective_pool(id)` | Elective Pool ID |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT TRUE | Status: Active / Inactive |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Updated timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

## API Endpoints Reference

### Folder 1: Elective Pool (Image 1)

| Action | Method | Route | Description |
|---|---|---|---|
| **Create Pool** | `POST` | `/electivePool/create` or `/electivePool` | Create a new elective pool (default scope: `programme`) |
| **List Pools** | `GET` | `/electivePool/list` or `/electivePool` | Get paginated pools with `mappedCoursesCount`, search, scope filter |
| **Get Pool by ID** | `GET` | `/electivePool/:id` | Get single pool with programme, batch & institute details |
| **Update Pool** | `PATCH` | `/electivePool/update/:id` or `/electivePool/:id` | Update name, code, description, scope, courseId |
| **Toggle Status** | `PATCH` | `/electivePool/toggleStatus/:id` | Toggle `is_active` between Active and Inactive |
| **Delete Pool** | `DELETE` | `/electivePool/delete/:id` or `/electivePool/:id` | Soft delete pool |

#### Example: Create Elective Pool (Image 1 Modal)
```http
POST /electivePool/create HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "name": "Architecture Professional Electives",
  "code": "ARCH-PROF",
  "description": "Advanced discipline-specific electives for architecture and allied areas.",
  "scope": "programme",
  "courseId": 34,
  "instituteId": 12
}
```

---

### Folder 2: Elective Pool Subject Mapping (Image 2)

| Action | Method | Route | Description |
|---|---|---|---|
| **Available Courses** | `GET` | `/electivePool/subjects/available` | Image 2 Course Master table with programme, components, and dynamic `selectionStatus` (`Already in Pool` vs `Available`) |
| **Add Courses** | `POST` | `/electivePool/subjects/map` | "Add Courses" button - bulk map selected courses to pool |
| **Mapped Courses** | `GET` | `/electivePool/subjects/mapped/:poolId` | Get all courses currently mapped in the pool |
| **Remove Course** | `DELETE` | `/electivePool/subjects/unmap` | Remove single course from pool |

#### Example: Get Available Courses (Image 2 Modal)
```http
GET /electivePool/subjects/available?electivePoolId=1&limit=10&page=1 HTTP/1.1
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "status": 200,
  "message": "Available courses fetched successfully",
  "data": [
    {
      "subjectId": 129,
      "subjectName": "Ecology & Built Environment",
      "subjectCode": "1AR1",
      "subjectType": "Theoretical",
      "isActive": true,
      "term": 1,
      "programme": {
        "courseId": 34,
        "courseName": "Bachelors in Architecture",
        "courseCode": "BARCH"
      },
      "components": [
        { "id": 1, "componentName": "Theory", "code": "TH" }
      ],
      "selectionStatus": "Already in Pool",
      "isAlreadyInPool": true
    },
    {
      "subjectId": 130,
      "subjectName": "Structures I",
      "subjectCode": "ARC103",
      "subjectType": "Theoretical",
      "isActive": true,
      "term": 1,
      "programme": {
        "courseId": 34,
        "courseName": "Bachelors in Architecture",
        "courseCode": "BARCH"
      },
      "components": [
        { "id": 1, "componentName": "Theory", "code": "TH" },
        { "id": 2, "componentName": "Practical", "code": "PR" }
      ],
      "selectionStatus": "Available",
      "isAlreadyInPool": false
    }
  ],
  "paginationData": {
    "total": 39,
    "page": 1,
    "limit": 10,
    "totalPages": 4
  }
}
```

#### Example: Add Courses to Pool (Image 2 "Add 4 Courses" Button)
```http
POST /electivePool/subjects/map HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "electivePoolId": 1,
  "subjectIds": [129, 130, 131, 132]
}
```


---

### Folder 3: Curriculum Elective Requirement (Image 3)

Mount: `/curriculumElectiveRequirement`, `/api/curriculum-elective-requirements`

| Action | Method | Route | Description |
|---|---|---|---|
| **Add Requirement** | `POST` | `/curriculumElectiveRequirement/create` | Modal Add Requirement (Image 3) |
| **List Requirements** | `GET` | `/curriculumElectiveRequirement/list` | List by `?curriculumId=9&term=1` with pool preview & count |
| **Filter by Category** | `GET` | `/curriculumElectiveRequirement/list` | Filter by `?curriculumCategoryId=1` |
| **Get Requirement by ID** | `GET` | `/curriculumElectiveRequirement/:id` | Single requirement view with **eligible students list** & **studentsSummary** |
| **Get Requirement Overview** | `GET` | `/curriculumElectiveRequirement/:id/overview` | **Overview Dashboard** (Image Screen) with academic context, KPIs, progress %, and pool courses table |
| **Get Course Offerings** | `GET` | `/curriculumElectiveRequirement/:id/course-offerings` | **Course Offerings Tab** (Image 1) with 4 KPIs, sections, capacity, routine status & availability |
| **Update Requirement** | `PATCH` | `/curriculumElectiveRequirement/update/:id` | Update name, coursesRequired, minCredits |
| **Toggle Status** | `PATCH` | `/curriculumElectiveRequirement/toggleStatus/:id` | Toggle active status |
| **Delete Requirement** | `DELETE` | `/curriculumElectiveRequirement/delete/:id` | Soft delete requirement |

#### Example: Add Elective Requirement to Term (Image 3 Modal)
```http
POST /curriculumElectiveRequirement/create HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "curriculumId": 9,
  "term": 1,
  "requirementCode": "PE-1",
  "requirementName": "Professional Elective I",
  "curriculumCategoryId": 1,
  "courseCount": true,
  "coursesRequired": 1,
  "minCredits": 3.0,
  "electivePoolId": 1
}
```

#### Example: Get Requirement by ID (with Eligible Students Data)
```http
GET /curriculumElectiveRequirement/1?studentLimit=10&studentPage=1 HTTP/1.1
Authorization: Bearer {{token}}
```

**Supported Query Parameters:**
- `studentLimit` (integer, optional): Paginate the students array.
- `studentPage` (integer, optional, default: 1): Page number for students list.
- `studentSection` (string, optional): Filter by section (e.g. `A`, `B`).
- `studentSearch` (string, optional): Search students by name, scholar number, or enroll number.
- `studentStatus` (string, optional): Filter by status (`Allocated`, `Pending`, `Partially Allocated`).
- `includeStudents` (boolean, optional, default: true): Pass `false` to omit students array.

**Response Structure:**
```json
{
  "status": 200,
  "message": "Curriculum elective requirement fetched successfully",
  "data": {
    "id": 1,
    "curriculumId": 1,
    "term": 1,
    "requirementCode": "PE-1",
    "requirementName": "Professional Elective I",
    "curriculumCategoryId": 1,
    "courseCount": true,
    "coursesRequired": 1,
    "minCredits": 3.0,
    "electivePoolId": 1,
    "isActive": true,
    "curriculumCategory": {
      "id": 1,
      "categoryName": "Professional Elective",
      "code": "PE"
    },
    "electivePool": {
      "id": 1,
      "name": "Architecture Professional Electives",
      "code": "ARCH-PROF",
      "scope": "programme",
      "isActive": true,
      "eligibleCoursesCount": 18
    },
    "curriculum": {
      "curriculumId": 1,
      "name": "Curriculum BARCH - Batch 2026",
      "courseId": 34,
      "course": {
        "courseId": 34,
        "courseName": "Bachelors in Architecture",
        "courseCode": "BARCH",
        "totalTerms": 10
      }
    },
    "studentsSummary": {
      "totalEligibleStudents": 94,
      "allocatedStudents": 0,
      "pendingStudents": 94
    },
    "students": [
      {
        "studentId": 2268,
        "scholarNumber": "Asa@rj03/BARCH/2026/100045",
        "enrollNumber": null,
        "firstName": "Aadish",
        "middleName": null,
        "lastName": "Jain",
        "fullName": "Aadish Jain",
        "batchId": 12,
        "batchYear": 2026,
        "term": 1,
        "section": "A",
        "status": "Pending",
        "allocatedElectives": []
      }
    ],
    "studentsPagination": {
      "total": 94,
      "page": 1,
      "limit": 10,
      "totalPages": 10
    }
  }
}
```

#### Example: Get Requirement Overview Dashboard (Overview Screen)
```http
GET /curriculumElectiveRequirement/1/overview HTTP/1.1
Authorization: Bearer {{token}}
```

*(Also accessible via `GET /curriculumElectiveRequirement/1?view=overview`)*

**Supported Query Parameters:**
- `courseSearch` (string, optional): Filter pool courses by code or title (e.g. `?courseSearch=Architecture`).

**Response Structure (Directly renders the Overview UI):**
```json
{
  "status": 200,
  "message": "Curriculum elective requirement overview fetched successfully",
  "data": {
    "id": 1,
    "requirementCode": "REQ-PE1",
    "requirementName": "Professional Elective I",
    "statusBadge": "Assignment In Progress",
    "academicContext": {
      "term": 5,
      "termRoman": "Term V",
      "academicPeriod": "Term V (Jul - Dec 2026)",
      "programmeCode": "BARCH",
      "programmeName": "Bachelors in Architecture",
      "programme": "BARCH (Bachelors in Architecture)",
      "admissionBatch": 2024,
      "admissionBatchSpan": "Admission Batch 2024-29",
      "poolName": "Architecture Professional Electives",
      "coursesRequired": 1,
      "minCredits": 3.0,
      "poolSubtitle": "Select 1 course • Minimum 3 credits"
    },
    "kpiSummary": {
      "applicableStudents": 65,
      "applicableStudentsSubtitle": "from BARCH 2024-29",
      "requiringAssignment": 47,
      "requiringPercentage": "72.3%",
      "assignedStudents": 18,
      "assignedPercentage": "27.7%",
      "eligibleCoursesCount": 12,
      "eligibleCoursesSubtitle": "from curriculum pool"
    },
    "assignmentProgress": {
      "progressPercentage": 27.7,
      "assignedCount": 18,
      "assignedPercentage": "27.7%",
      "awaitingCount": 47,
      "awaitingPercentage": "72.3%",
      "needsAttentionCount": 0,
      "needsAttentionPercentage": "0%",
      "progressText": "18 of 65 students have a confirmed eligible course assignment."
    },
    "curriculumRequirement": {
      "requirementCode": "REQ-PE1",
      "requirementName": "Professional Elective I",
      "curriculumCategory": {
        "id": 1,
        "categoryName": "Professional Elective",
        "code": "PE"
      },
      "poolName": "Architecture Professional Electives",
      "ruleText": "Select 1 course from the pool • Minimum 3 recognised credits"
    },
    "eligibleElectiveCourses": [
      {
        "subjectId": 129,
        "courseCode": "ARCH501",
        "courseTitle": "Sustainable Architecture",
        "credits": 3,
        "creditsText": "3",
        "offeringStatus": "Not Offered",
        "assignedStudentsCount": 0,
        "assignedStudentsText": "-"
      },
      {
        "subjectId": 130,
        "courseCode": "ARCH504",
        "courseTitle": "Building Technology",
        "credits": 3,
        "creditsText": "3",
        "offeringStatus": "Published",
        "assignedStudentsCount": 18,
        "assignedStudentsText": "18"
      }
    ]
  }
}
```

#### Example: Get Elective Requirement Course Offerings (Course Offerings Tab)
```http
GET /curriculumElectiveRequirement/1/course-offerings?limit=10&page=1 HTTP/1.1
Authorization: Bearer {{token}}
```

**Supported Query Parameters:**
- `search` (string, optional): Filter by course code or title.
- `offeringStatus` (string, optional): Filter by offering status (`Published`, `Draft`, `Not Created`).
- `routineStatus` (string, optional): Filter by routine status (`Published`, `Draft`, `Not Scheduled`).
- `assignmentAvailability` (string, optional): Filter by availability (`Available`, `Not Available`, `Credit Mapping Required`).
- `recognisedCredits` (number, optional): Filter by credits (e.g. `3`).
- `limit` (integer, optional, default: 10): Page size.
- `page` (integer, optional, default: 1): Page number.

**Response Structure (Directly powers the Course Offerings Tab):**
```json
{
  "status": 200,
  "message": "Curriculum elective course offerings fetched successfully",
  "data": {
    "id": 1,
    "requirementCode": "REQ-PE1",
    "requirementName": "Professional Elective I",
    "statusBadge": "Assignment In Progress",
    "academicContext": {
      "term": 5,
      "termRoman": "Term V",
      "academicPeriod": "Term V (Jul - Dec 2026)",
      "programmeCode": "BARCH",
      "programmeName": "Bachelor of Architecture",
      "programme": "BARCH (Bachelor of Architecture)",
      "admissionBatch": 2024,
      "admissionBatchSpan": "Admission Batch 2024-29",
      "poolName": "Architecture Professional Electives",
      "coursesRequired": 1,
      "minCredits": 3.0,
      "poolSubtitle": "Select 1 course • Minimum 3 recognised credits"
    },
    "kpiSummary": {
      "eligibleCourses": 12,
      "eligibleCoursesSubtitle": "from curriculum pool",
      "coursesWithOfferings": 7,
      "coursesWithOfferingsSubtitle": "with teaching offerings in this term",
      "availableForAssignment": 5,
      "availableForAssignmentSubtitle": "published offering, published routine, valid credits and eligible for this requirement",
      "assignedStudents": 18,
      "assignedStudentsSubtitle": "under this requirement"
    },
    "courseOfferings": [
      {
        "index": 1,
        "subjectId": 129,
        "courseCode": "ARCH501",
        "courseTitle": "Sustainable Architecture",
        "recognisedCredits": 3,
        "recognisedCreditsText": "3",
        "offeringStatus": "Published",
        "routineStatus": "Published",
        "sectionsCount": 2,
        "sectionsText": "2",
        "sharedCapacity": 60,
        "sharedCapacityText": "60",
        "assignedStudentsCount": 12,
        "assignedStudentsText": "12",
        "assignmentAvailability": "Available"
      },
      {
        "index": 2,
        "subjectId": 130,
        "courseCode": "ARCH505",
        "courseTitle": "Landscape Architecture",
        "recognisedCredits": null,
        "recognisedCreditsText": "Not Mapped",
        "offeringStatus": "Published",
        "routineStatus": "Published",
        "sectionsCount": 1,
        "sectionsText": "1",
        "sharedCapacity": 40,
        "sharedCapacityText": "40",
        "assignedStudentsCount": 0,
        "assignedStudentsText": "0",
        "assignmentAvailability": "Credit Mapping Required"
      }
    ],
    "paginationData": {
      "total": 12,
      "page": 1,
      "limit": 10,
      "totalPages": 2
    }
  }
}
```


#### Example: Get Elective Requirement Assignments (Student-wise Tab)
```http
GET /curriculumElectiveRequirement/1/assignments?view=student-wise&limit=10&page=1 HTTP/1.1
Authorization: Bearer {{token}}
```

**Supported Query Parameters:**
- `view` (string, optional, default: `"student-wise"`): `"student-wise"` or `"course-wise"`.
- `search` (string, optional): Filter by student name, enrolment number, or scholar number.
- `assignmentStatus` (string, optional): Filter by status (`"All"`, `"Assigned"`, `"Awaiting"`).
- `courseId` (integer, optional): Filter by assigned subject ID.
- `assignmentSource` (string, optional): Filter by source (`"All"`, `"Direct"`, `"Selection Round"`).
- `limit` (integer, optional, default: 10): Page size.
- `page` (integer, optional, default: 1): Page number.

**Response Structure (Directly powers Image 3 Student-wise Tab):**
```json
{
  "status": 200,
  "message": "Curriculum elective assignments fetched successfully",
  "data": {
    "id": 1,
    "requirementCode": "REQ-PE1",
    "requirementName": "Professional Elective I",
    "statusBadge": "Assignment In Progress",
    "academicContext": {
      "term": 5,
      "termRoman": "Term V",
      "academicPeriod": "Term V (Jul - Dec 2026)",
      "programmeCode": "BARCH",
      "programmeName": "Bachelor of Architecture",
      "programme": "BARCH (Bachelor of Architecture)",
      "admissionBatch": 2024,
      "admissionBatchSpan": "Admission Batch 2024-29",
      "poolName": "Architecture Professional Electives",
      "coursesRequired": 1,
      "minCredits": 3.0,
      "poolSubtitle": "Select 1 course • Minimum 3 credits"
    },
    "kpiSummary": {
      "applicableStudents": {
        "count": 65,
        "label": "Applicable Students",
        "subtitle": "from B.Arch 2024-29 · Term V"
      },
      "assigned": {
        "count": 18,
        "percentage": 27.7,
        "label": "Assigned",
        "subtitle": "27.7% of 65 students"
      },
      "awaitingAssignment": {
        "count": 47,
        "percentage": 72.3,
        "label": "Awaiting Assignment",
        "subtitle": "72.3% of 65 students"
      },
      "needsAttention": {
        "count": 0,
        "label": "Needs Attention",
        "subtitle": "no blocking issues"
      }
    },
    "assignmentRule": {
      "coursesRequired": 1,
      "minCredits": 3,
      "ruleText": "1 course · Minimum 3 recognised credits"
    },
    "view": "student-wise",
    "students": [
      {
        "srNo": 1,
        "studentId": 101,
        "studentName": "Aarav Sharma",
        "enrolmentNo": "ARCH24001",
        "scholarNumber": "SCH-001",
        "assignedCourse": {
          "subjectId": 129,
          "courseCode": "ARCH501",
          "courseTitle": "Sustainable Architecture",
          "fullTitle": "Sustainable Architecture (ARCH501)"
        },
        "assignedCourseText": "Sustainable Architecture ARCH501",
        "recognisedCredits": 3,
        "recognisedCreditsText": "3",
        "assignmentSource": "Direct",
        "status": "Assigned",
        "statusBadge": {
          "label": "Assigned",
          "color": "green"
        },
        "availableActions": [
          "View / Edit"
        ]
      },
      {
        "srNo": 2,
        "studentId": 102,
        "studentName": "Kabir Jain",
        "enrolmentNo": "ARCH24003",
        "scholarNumber": "SCH-003",
        "assignedCourse": null,
        "assignedCourseText": "-",
        "recognisedCredits": null,
        "recognisedCreditsText": "-",
        "assignmentSource": "-",
        "status": "Awaiting",
        "statusBadge": {
          "label": "Awaiting",
          "color": "grey"
        },
        "availableActions": [
          "Assign"
        ]
      }
    ],
    "paginationData": {
      "total": 65,
      "page": 1,
      "limit": 10,
      "totalPages": 7
    }
  }
}
```

#### Example: Get Elective Requirement Assignments (Course-wise Tab)
```http
GET /curriculumElectiveRequirement/1/assignments?view=course-wise&limit=10&page=1 HTTP/1.1
Authorization: Bearer {{token}}
```

**Response Structure (Directly powers Image 4 Course-wise Tab):**
```json
{
  "status": 200,
  "message": "Curriculum elective assignments fetched successfully",
  "data": {
    "id": 1,
    "requirementCode": "REQ-PE1",
    "requirementName": "Professional Elective I",
    "statusBadge": "Assignment In Progress",
    "academicContext": {
      "term": 5,
      "termRoman": "Term V",
      "academicPeriod": "Term V (Jul - Dec 2026)",
      "programme": "BARCH (Bachelor of Architecture)",
      "admissionBatchSpan": "Admission Batch 2024-29",
      "poolName": "Architecture Professional Electives"
    },
    "kpiSummary": {
      "applicableStudents": { "count": 65, "label": "Applicable Students" },
      "assigned": { "count": 18, "percentage": 27.7, "label": "Assigned" },
      "awaitingAssignment": { "count": 47, "percentage": 72.3, "label": "Awaiting Assignment" },
      "needsAttention": { "count": 0, "label": "Needs Attention" }
    },
    "view": "course-wise",
    "courseAssignments": [
      {
        "srNo": 1,
        "subjectId": 129,
        "courseCode": "ARCH501",
        "courseTitle": "Sustainable Architecture",
        "teachingType": "Studio Based",
        "recognisedCredits": 3,
        "recognisedCreditsText": "3",
        "assignedStudents": {
          "count": 12,
          "percentage": 18.5,
          "text": "12 (18.5% of 65 students)"
        },
        "seatOccupancy": {
          "enrolledSeats": 28,
          "totalCapacity": 40,
          "remainingSeats": 12,
          "occupancyPercentage": 70.0,
          "occupancyText": "28 / 40",
          "remainingText": "12 seats remaining",
          "tooltip": "Total students enrolled in this course offering across all participating programmes, batches and terms. Capacity is managed centrally through Timetable & Routine."
        },
        "assignmentAvailability": "Available",
        "assignmentAvailabilityBadge": {
          "label": "Available",
          "remainingText": "12 seats remaining",
          "color": "green"
        },
        "availableActions": [
          "Manage Students ->"
        ]
      },
      {
        "srNo": 2,
        "subjectId": 130,
        "courseCode": "ARCH520",
        "courseTitle": "Urban Design Studio",
        "teachingType": "Studio Based",
        "recognisedCredits": 3,
        "recognisedCreditsText": "3",
        "assignedStudents": {
          "count": 0,
          "percentage": 0.0,
          "text": "0 (0% of 65 students)"
        },
        "seatOccupancy": {
          "enrolledSeats": 30,
          "totalCapacity": 30,
          "remainingSeats": 0,
          "occupancyPercentage": 100.0,
          "occupancyText": "30 / 30",
          "remainingText": "0 seats remaining"
        },
        "assignmentAvailability": "Full",
        "assignmentAvailabilityBadge": {
          "label": "Full",
          "remainingText": "No seats available",
          "color": "red"
        },
        "availableActions": [
          "View Students"
        ]
      }
    ],
    "paginationData": {
      "total": 6,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
}
```

#### Example: Assign Single Course to Student
```http
POST /curriculumElectiveRequirement/1/assign HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "studentId": 2268,
  "subjectId": 129,
  "assignmentSource": "Direct"
}
```

#### Example: Assign Multiple Courses to a Single Student
```http
POST /curriculumElectiveRequirement/1/assign HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "studentId": 2268,
  "subjectIds": [129, 130],
  "assignmentSource": "Direct",
  "mode": "replace"
}
```

#### Example: Bulk Assign Students to Elective Course
```http
POST /curriculumElectiveRequirement/1/bulk-assign HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "studentIds": [2268, 2269],
  "subjectId": 129,
  "assignmentSource": "Direct"
}
```

#### Example: Unassign Student from Elective Course
```http
DELETE /curriculumElectiveRequirement/1/unassign/2268 HTTP/1.1
Authorization: Bearer {{token}}
```


#### Example: Get Course Students for Management (Image 4 "Manage Students ->" Action)
```http
GET /curriculumElectiveRequirement/1/course-students/129?search= HTTP/1.1
Authorization: Bearer {{token}}
```

**Response Structure:**
```json
{
  "status": 200,
  "message": "Course students for management fetched successfully",
  "data": {
    "requirementId": 1,
    "requirementCode": "REQ-PE1",
    "requirementName": "Professional Elective I",
    "courseInfo": {
      "subjectId": 129,
      "courseCode": "ARCH501",
      "courseTitle": "Sustainable Architecture",
      "recognisedCredits": 3,
      "seatOccupancy": {
        "enrolledSeats": 12,
        "totalCapacity": 40,
        "remainingSeats": 28,
        "isFull": false,
        "occupancyPercentage": 30.0,
        "occupancyText": "12 / 40",
        "remainingText": "28 seats remaining"
      }
    },
    "summary": {
      "totalAssignedToThisCourse": 12,
      "totalAvailableToAssign": 53,
      "remainingSeats": 28,
      "canAssignMore": true
    },
    "assignedStudents": [
      {
        "studentId": 2268,
        "studentName": "Aadish Jain",
        "enrolmentNo": "ARCH24001",
        "scholarNumber": "ARCH24001",
        "assignmentSource": "Direct",
        "assignedAt": "2026-10-30T08:30:00.000Z",
        "status": "Assigned"
      }
    ],
    "availableStudents": [
      {
        "studentId": 2228,
        "studentName": "Aagam Jain",
        "enrolmentNo": "ARCH24002",
        "scholarNumber": "ARCH24002",
        "status": "Awaiting"
      }
    ]
  }
}
```

#### Example: Bulk Unassign Students from Elective Course
```http
POST /curriculumElectiveRequirement/1/bulk-unassign HTTP/1.1
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "studentIds": [2268, 2269]
}
```
