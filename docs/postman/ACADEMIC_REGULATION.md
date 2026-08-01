# Academic Regulation APIs

Complete CRUD APIs for managing academic regulations (`academic_regulation`).

**Mount Route:** `/academicRegulation`  
**Postman Collection:** [univ-v2-academic-group.postman_collection.json](./univ-v2-academic-group.postman_collection.json) (`Academic Regulation` folder)

---

## Schema Overview (`academic_regulation`)

| Field | Type | Attributes | Description |
|-------|------|------------|-------------|
| `academicRegulationId` | `INTEGER` | PK, Auto Increment | Primary key (`academic_regulation_id`) |
| `regulationCode` | `STRING(50)` | NOT NULL | Regulation code (e.g. `AR-2026-BCH`) |
| `regulationName` | `STRING(150)` | NOT NULL | Regulation title / name |
| `description` | `STRING(500)` | NULLABLE | Description |
| `courseId` | `INTEGER` | FK → `course` | Associated course / programme |
| `academicYearId` | `INTEGER` | NOT NULL, FK → `acedmic_year` | Academic year (lifted from user details if omitted) |
| `applicableBatch` | `STRING(50)` | NULLABLE | Batch (e.g. `2026-2030`) |
| `effectiveFrom` | `DATEONLY` | NULLABLE | Effective start date |
| `effectiveUntil` | `DATEONLY` | NULLABLE | Effective end date |
| `gradingSchemeId` | `BIGINT` | FK → `grading` | Linked grading scheme |
| `version` | `DECIMAL(3,1)` | NOT NULL, Default `1.0` | Regulation version (**auto-increments by +0.1 on every update**) |
| `status` | `ENUM` | `DRAFT`, `PUBLISHED`, `ARCHIVED` | Status |
| `isActive` | `BOOLEAN` | Default `true` | Active status |
| `universityId` | `INTEGER` | NOT NULL, FK → `university` | University ID (lifted from user) |
| `instituteId` | `INTEGER` | NOT NULL, FK → `institute` | Institute ID (lifted from user) |
| `createdBy` | `INTEGER` | NOT NULL, FK → `users` | Creator user ID |
| `updatedBy` | `INTEGER` | NOT NULL, FK → `users` | Updater user ID |
| `createdAt` | `TIMESTAMP` | NOT NULL | Creation timestamp |
| `updatedAt` | `TIMESTAMP` | NOT NULL | Update timestamp |
| `deletedAt` | `TIMESTAMP` | NULLABLE | Soft delete timestamp |

---

## Key Feature: Automatic Version Increment (+0.1)

- When an academic regulation is created via `POST /academicRegulation`, its initial `version` is set to `1.0`.
- On every update via `PUT /academicRegulation/:academicRegulationId` or `PATCH /academicRegulation/:academicRegulationId`, the backend calculates `decimalAdd(currentVersion, 0.1)`, incrementing `version` to `1.1`, `1.2`, `1.3`, etc.

---

## API Endpoints

### 1. Create Academic Regulation
`POST /academicRegulation`

**Payload:**
```json
{
  "regulationCode": "AR-2026-BCH",
  "regulationName": "Academic Regulation 2026 B.Tech",
  "description": "Standard Academic Regulation for Batch 2026",
  "programmeId": 34,
  "academicYearId": 60,
  "applicableBatch": "2026-2030",
  "effectiveFrom": "2026-07-01",
  "effectiveUntil": "2030-06-30",
  "gradingSchemeId": 1,
  "status": "DRAFT",
  "isActive": true
}
```

### 2. List Academic Regulations
`GET /academicRegulation?search=AR-2026&status=DRAFT&programmeId=34&page=1&limit=10`

### 3. Get Single Regulation Details
`GET /academicRegulation/:academicRegulationId`

### 4. Update Academic Regulation
`PUT /academicRegulation/:academicRegulationId` or `PATCH /academicRegulation/:academicRegulationId`

**Payload:**
```json
{
  "regulationName": "Academic Regulation 2026 B.Tech Updated",
  "status": "PUBLISHED"
}
```

### 5. Delete Academic Regulation
`DELETE /academicRegulation/:academicRegulationId`
