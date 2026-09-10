# Assessment Plan APIs

APIs for Batch Configuration / Plan Library under Examination → Academic Setup.

**Mount:** `/assessmentPlan`  
**Auth:** Bearer token required (`Authorization: Bearer {{token}}`)  
**Tenant context:** Uses user defaults (`academicYearId`, `instituteId`, `universityId`) from save-user-defaults / request scope.

**Postman collection:** [univ-v2-assessment-plan.postman_collection.json](./univ-v2-assessment-plan.postman_collection.json)

---

## Changelog (2026-09-10)

### `GET /assessmentPlan/batchCoursesSessions`
- Removed query filters `batch` and `batchYear`.
- Resolves **active academic year** from tenant `academicYearId` (e.g. `60`).
- Derives **activeBatchYear** from academic year `startingDate` (e.g. `2026-07-01` → `2026`).
- Returns **one object per `courseId` + `sessionId`**.
- Sessions are limited to that `academicYearId` only (not sessions from other years).
- Includes only the **active admission batch** (`batch === activeBatchYear`).

### `GET /assessmentPlan/overview`
- Subjects come from curriculum tables (`curriculum` → `curriculum_subject_term_mapping` → `curriculum_batch_mapping` / `curriculum_batch_term_mapping`), not a direct subject list alone.
- Optional `batch` filter (e.g. `2024`, `2025`, or `2024,2025`).
- Subjects are limited to terms whose `curriculum_batch_term_mapping.year` matches the active academic calendar year (from tenant AY `startingDate`).
- Each subject row includes `batch`, `batchName`, `subjectType`, `subjectCategory`, `electiveOrCore`, etc.
- Use `limit` for page size (no `pageSize` alias).

---

## Sample FE flow

```
GET /assessmentPlan/batchCoursesSessions?courseId=34
        ↓  pick courseId + sessionId + active batch
GET /assessmentPlan/overview?courseId=34&sessionId=6&batch=2026&page=1&limit=10
        ↓  assign plans to subjects
POST /assessmentPlan/subjectMapping
```

---

## 1. Batch Courses + Sessions

### API Name
Get Batch Courses With Sessions

### Method
`GET`

### Endpoint
`/assessmentPlan/batchCoursesSessions`

### Description
Lists course + session combinations for the tenant **active academic year**, with the **active admission batch** only.

Business rules:
- Reads `academicYearId` from tenant store.
- `activeBatchYear` = year part of academic year `startingDate`.
- Sessions must belong to that `academicYearId`.
- Curriculum batch row must equal `activeBatchYear`.
- Subject counts use curriculum subject-term mappings for terms active in that calendar year (`curriculum_batch_term_mapping.year`).

### Authentication
Bearer Token Required

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | `Bearer {{token}}` |

### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| courseId | Number | No | — | Filter to one programme / course |

### Removed query params
- `batch` — removed; active batch comes from tenant academic year
- `batchYear` — removed

### Success response example

```json
{
  "success": true,
  "message": "Batch courses with sessions fetched successfully",
  "data": [
    {
      "courseId": 34,
      "sessionId": 20,
      "activeBatchYear": 2026,
      "course": {
        "courseId": 34,
        "courseName": "Bachelors in Architecture",
        "courseCode": "BARCH",
        "termType": "Sem",
        "totalTerms": 10,
        "courseDuration": 5,
        "durationYears": 5
      },
      "session": {
        "sessionId": 20,
        "sessionName": "Morning Session July 26",
        "startingDate": "2026-06-01",
        "endingDate": "2027-07-31",
        "academicYearId": 60,
        "academicYear": {
          "academicYearId": 60,
          "yearTitle": "2026-2027",
          "startingDate": "2026-07-01",
          "endingDate": "2027-06-30",
          "isActive": true
        }
      },
      "batch": {
        "curriculumBatchMappingId": 1,
        "curriculumId": 1,
        "batch": 2026,
        "batchEndYear": 2031,
        "batchName": "2026 – 31",
        "curriculum": {
          "curriculumId": 1,
          "name": "Curriculum BARCH - Batch 2026"
        },
        "totalSubjects": 11,
        "assignedSubjects": 3,
        "assignmentStatus": "Partially Assigned"
      }
    }
  ]
}
```

### assignmentStatus enum

```
Pending
Partially Assigned
Fully Assigned
```

### Error codes

| Status | Reason |
|--------|--------|
| 400 | Active academic year / starting date missing |
| 401 | Unauthorized |
| 500 | Internal Server Error |

---

## 2. Course Assessment Plan Overview (subjects)

### API Name
Get Course Assessment Plan Overview

### Method
`GET`

### Endpoint
`/assessmentPlan/overview`

### Description
Paginated subject list for assessment-plan assignment UI.

Subjects are loaded from:
- `curriculum`
- `curriculum_subject_term_mapping`
- `curriculum_batch_mapping`
- `curriculum_batch_term_mapping`

Only subject terms whose batch-term `year` matches the tenant active academic calendar year are returned. Different `batch` values therefore return different subject sets (e.g. 11 vs 4).

### Authentication
Bearer Token Required

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes | `Bearer {{token}}` |

### Query Parameters

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| courseId | Number | No | — | Programme filter |
| sessionId | Number | No | — | Filters assessment-plan mappings by session |
| batch | Number / comma list | No | — | Admission batch(es), e.g. `2026` or `2024,2025` |
| subjectId | Number | No | — | Single subject |
| assessmentPlanId | Number | No | — | Filter mappings |
| academicRegulationId | Number | No | — | Filter via plan regulation |
| assignmentStatus | Enum | No | `all` | See enum below |
| term | Number | No | — | Curriculum subject term |
| search | String | No | — | Subject name / code |
| page | Number | No | `1` | Page number |
| limit | Number | No | `10` | Page size |

### assignmentStatus enum

```
all
assigned
unassigned
```

### Removed / not supported
- `pageSize` — use `limit` only

### Success response example

```json
{
  "success": true,
  "message": "Course assessment plan overview fetched successfully",
  "data": {
    "totalRecords": 11,
    "totalPages": 2,
    "currentPage": 1,
    "pageSize": 10,
    "data": [
      {
        "curriculumSubjectTermMappingId": 101,
        "curriculumId": 1,
        "curriculumBatchMappingId": 1,
        "curriculumName": "Curriculum BARCH - Batch 2026",
        "courseId": 34,
        "subjectId": 55,
        "subjectName": "Design Studio I",
        "subjectCode": "AR101",
        "shortName": "DS1",
        "description": null,
        "isActive": true,
        "term": 1,
        "batch": 2026,
        "batchEndYear": 2031,
        "batchName": "2026 – 31",
        "subjectType": "Core",
        "subjectCategory": "Theory",
        "electiveOrCore": "core",
        "yearNumber": 1,
        "year": 2026,
        "course": {
          "courseId": 34,
          "courseName": "Bachelors in Architecture",
          "courseCode": "BARCH",
          "academicRegulations": []
        },
        "assessmentPlanMappings": []
      }
    ]
  }
}
```

### electiveOrCore values

```
core
elective
```

(Derived from `subjectType`; other types may return a normalized lowercase string.)

### subjectType enum (from subject master)

```
Core
Elective
Open Elective
Department Elective
Foundation
Skill Enhancement
Ability Enhancement
Value Added
Internship
Dissertation
Audit
```

### subjectCategory enum

```
Theory
Practical
Lab
Project
Seminar
Workshop
```

### Error codes

| Status | Reason |
|--------|--------|
| 400 | Active academic year missing / validation |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## 3. Assessment Plan Stats

### Method
`GET`

### Endpoint
`/assessmentPlan/stats`

### Description
Summary counts for coverage cards (total / assigned / unassigned / overridden / coverage %).

### Auth
Bearer + `GRADING_SETUP` permission

---

## 4. Assessment Plan CRUD

| Method | Endpoint | Permission |
|--------|----------|------------|
| POST | `/assessmentPlan` | GRADING_SETUP_ADD |
| GET | `/assessmentPlan` | GRADING_SETUP |
| GET | `/assessmentPlan/:assessmentPlanId` | GRADING_SETUP |
| PATCH | `/assessmentPlan/:assessmentPlanId` | GRADING_SETUP_EDIT |
| DELETE | `/assessmentPlan/:assessmentPlanId` | GRADING_SETUP |

### Create body example

```json
{
  "planName": "BARCH Continuous Assessment 2026",
  "planCode": "BARCH-CA-2026",
  "description": "Internal + external components",
  "courseId": 34,
  "sessionId": 20,
  "regulationId": 1,
  "term": 1,
  "gradingId": 1,
  "status": "Draft",
  "isActive": true,
  "components": [
    {
      "examSetupTypeId": 2,
      "weightagePercentage": 40,
      "maxAssessments": 2,
      "duration": 90
    }
  ]
}
```

### status enum

```
Draft
Published
```

---

## 5. Components

| Method | Endpoint |
|--------|----------|
| POST | `/assessmentPlan/component` |
| PATCH | `/assessmentPlan/component/:assessmentPlanComponentId` |
| DELETE | `/assessmentPlan/component/:assessmentPlanComponentId` |

---

## 6. Subject Mapping

| Method | Endpoint |
|--------|----------|
| POST | `/assessmentPlan/subjectMapping` |
| GET | `/assessmentPlan/subjectMapping` |
| DELETE | `/assessmentPlan/subjectMapping/:mappingId` |

### Create body

```json
{
  "assessmentPlanId": 10,
  "subjectId": 55,
  "courseId": 34,
  "sessionId": 20
}
```

### Business rules
- Plan must be `Published` and `isActive`.
- Subject must belong to `courseId`.
- Session must be mapped to course.
- Plan / subject / session academic years must align with the plan’s academic year.
