# Assessment Plan & Examination Session Term — API Updates

**Date:** 2026-09-10  
**Auth:** `Authorization: Bearer {{token}}`  
**Tenant:** `academicYearId`, `instituteId`, `universityId` from user defaults / request scope.

**Postman:** [univ-v2-assessment-plan.postman_collection.json](./univ-v2-assessment-plan.postman_collection.json)

---

## Changelog summary

| Area | Change |
|------|--------|
| `GET /assessmentPlan/batchCoursesSessions` | One object per `courseId` + `sessionId` (active AY); `batches[]` = current + previous admission years |
| `GET /assessmentPlan/overview` | Required `curriculumBatchMappingId`; terms 1…N nested; subject `status`: `previous` \| `current` \| `upcoming` |
| `POST /assessmentPlan` | No `sessionId` on plan; `academicYearId` loaded from tenant |
| `GET/PATCH /assessmentPlan` | No `sessionId` filter / field on plan |
| Subject mapping APIs | Mapping table **keeps** `sessionId`; plan does not |
| DB migration | `assessment_plan.session_id` removed |
| Examination session create / update / term | Before creating `examination_session_term`, all curriculum subjects for `courseId + sessionId + term` must be assessment-plan mapped |

---

## FE flow

```
GET /assessmentPlan/batchCoursesSessions?courseId=34
        ↓ pick courseId + sessionId + curriculumBatchMappingId from batches[]
GET /assessmentPlan/overview?curriculumBatchMappingId=2
        ↓ assign plans (Publish plan first)
POST /assessmentPlan
POST /assessmentPlan/subjectMapping
        ↓ then create exam session term
POST /examinationSession/term
```

---

## 1. Assessment Plan APIs

Mount: `/assessmentPlan`

### 1.1 `GET /assessmentPlan/batchCoursesSessions`

**Query**

| Name | Required | Description |
|------|----------|-------------|
| courseId | No | Filter one programme |

**Rules**
- Tenant `academicYearId` → sessions only for that year
- `activeBatchYear` from AY `startingDate` year part
- `batches[]` where `batch <= activeBatchYear` (newest first)
- Subject counts = whole-batch curriculum subjects

**Example**
```
{{base_url}}/assessmentPlan/batchCoursesSessions?courseId=34
```

**Response shape**
```json
{
  "courseId": 34,
  "sessionId": 20,
  "activeBatchYear": 2026,
  "course": { "courseId": 34, "courseName": "...", "durationYears": 5 },
  "session": { "sessionId": 20, "academicYearId": 60 },
  "batches": [
    {
      "curriculumBatchMappingId": 1,
      "batch": 2026,
      "batchName": "2026 – 31",
      "totalSubjects": 88,
      "assignedSubjects": 3,
      "assignmentStatus": "Partially Assigned"
    },
    { "curriculumBatchMappingId": 2, "batch": 2025, "totalSubjects": 72 }
  ]
}
```

---

### 1.2 `GET /assessmentPlan/overview`

**Query**

| Name | Required | Default | Description |
|------|----------|---------|-------------|
| curriculumBatchMappingId | Yes | — | Batch mapping id from `batches[]` |
| term | No | — | Filter one term; enables subject pagination |
| page | No | 1 | Used when `term` is set |
| limit | No | 10 | Used when `term` is set |
| sessionId | No | — | Filter plan mappings by session |
| assignmentStatus | No | all | `assigned` \| `unassigned` \| `all` |
| search | No | — | Subject name / code |
| subjectId | No | — | |
| assessmentPlanId | No | — | |
| academicRegulationId | No | — | |

**Rules**
- Returns a flat paginated `subjects[]` list for the batch
- Optional `term` filters to one term
- Each subject includes `term`, `year`, `status`, and `course`
- Subject `status` vs tenant active calendar year (`curriculum_batch_term_mapping.year`):
  - `year < activeBatchYear` → `previous`
  - `year === activeBatchYear` → `current`
  - `year > activeBatchYear` → `upcoming`

**Examples**
```
{{base_url}}/assessmentPlan/overview?curriculumBatchMappingId=2&page=1&limit=10
{{base_url}}/assessmentPlan/overview?curriculumBatchMappingId=2&term=3&page=1&limit=10
```

**Response shape**
```json
{
  "curriculumBatchMappingId": 2,
  "batch": 2025,
  "activeBatchYear": 2026,
  "subjects": [
    {
      "subjectId": 64,
      "subjectCode": "3AR1",
      "term": 3,
      "year": 2026,
      "yearNumber": 2,
      "status": "current",
      "course": {
        "courseId": 1,
        "courseName": "B.Arch",
        "courseCode": "BARCH"
      },
      "assignmentStatus": "unassigned",
      "assessmentPlanMappings": []
    }
  ]
}
```

---

### 1.3 `POST /assessmentPlan`

**Body (no `sessionId`)**
```json
{
  "planName": "BARCH CA 2026",
  "planCode": "BARCH-CA-2026",
  "description": "optional",
  "courseId": 34,
  "regulationId": 1,
  "term": 3,
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

- `academicYearId` is set from tenant (`getAcademicYearId()` / user defaults)
- Plan is scoped by **courseId + academicYearId** only

### 1.4 `GET /assessmentPlan`

Query: `courseId`, `regulationId`, `academicYearId`, `gradingId`, `term`, `status`, `search`, `page`, `limit`  
**Removed:** `sessionId`

### 1.5 `PATCH /assessmentPlan/:assessmentPlanId`

Same fields as create (partial). Cannot change `sessionId` / `academicYearId` via body.

### 1.6 Subject mapping (mapping table keeps `sessionId`)

#### `POST /assessmentPlan/subjectMapping`
```json
{
  "assessmentPlanId": 1,
  "subjectId": 64,
  "courseId": 34,
  "sessionId": 20
}
```
Plan must be **Published**. Mapping stores `sessionId`; plan does not.

#### `GET /assessmentPlan/subjectMapping`
Query: `assessmentPlanId`, `subjectId`, `courseId`, `sessionId`, `academicYearId`, `page`, `limit`

#### `DELETE /assessmentPlan/subjectMapping/:mappingId`

### 1.7 Migration

`migrations/20260910213000-remove-session-id-from-assessment-plan.cjs`  
Drops `assessment_plan.session_id` (FK + indexes).

```bash
npm run migrate
```

---

## 2. Examination Session Term — assessment plan gate

Mount: `/examinationSession`

Before inserting `examination_session_term`, the API validates:

1. Load all curriculum subjects for **`courseId + term`** across **all batches**  
   (`curriculum` → `curriculum_batch_mapping` → `curriculum_subject_term_mapping`)
2. Each subject must have `assessment_plan_subject_mapping` for the same **`courseId + sessionId`**, and that subject must belong to the same **term** in curriculum
3. Otherwise → **400** listing unmapped subject codes

### Affected endpoints

| Method | Endpoint | When check runs |
|--------|----------|-----------------|
| `POST` | `/examinationSession` | When `terms[]` is provided |
| `PATCH` | `/examinationSession?examinationSessionId=` | When new terms are added |
| `POST` | `/examinationSession/term` | Always |

### `POST /examinationSession` — body `terms[]`

Each term requires `courseId`, `sessionId`, `term`:

```json
{
  "assessmentTypeId": 2,
  "sessionName": "Odd Sem Exams 2026",
  "status": "Draft",
  "terms": [
    {
      "term": 3,
      "courseId": 34,
      "sessionId": 20,
      "includeElectives": true
    }
  ]
}
```

### `POST /examinationSession/term`

```json
{
  "examinationSessionId": 1,
  "term": 3,
  "courseId": 34,
  "sessionId": 20,
  "includeElectives": true
}
```

### Example error

```text
Cannot create examination session term: 3 subject(s) for courseId 34, sessionId 20, term 3 are missing assessment plan mapping (3AR1, 3AR2, 3AR5).
```

---

## 3. Related course API (this chat)

### `GET /course/withSubjects`

No `instituteId` / academic year query required; uses tenant `scoped()`.

```
{{base_url}}/course/withSubjects
```
