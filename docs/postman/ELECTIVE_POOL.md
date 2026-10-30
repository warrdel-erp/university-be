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
