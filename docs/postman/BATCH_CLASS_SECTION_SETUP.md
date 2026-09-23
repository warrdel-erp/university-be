# Batch & Class Section Setup APIs

Postman collection: `docs/postman/univ-v2-batch-class-section-setup.postman_collection.json`

Auth: Bearer `{{token}}`  
Base URL: `{{baseurl}}` (default `http://localhost:8080`)

---

## Workflow

```
Create / publish batch
        ↓
GET /session/batches/:id/details          (setup status cards)
        ↓
POST /main/classSections                  (create sections by year)
        ↓
GET /course/termsWithClassSections        (year/term + sections)
        ↓
GET /session/batches/:id/academicProgression
        ↓
GET /session/batches/:batchId/students
```

---

## 1. Session — Batch setup

### 1.1 Get batch full details

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/session/batches/:id/details` |
| **Alt** | `/classSections/batchDetails?batchId=` |

**Path params**

| Name | Type | Required | Description |
|---|---|---|---|
| id | Integer | Yes | Batch ID |

**Response (data)**

- `currentYear` — active calendar year, `yearNumber`, `currentTerm`, `currentTerms`
- `batch` / `session` / `course` — basics
- `curriculum` — name + term/subject configured counts
- `assessmentPlan` — mapped subject counts
- `regulation` — basic regulation + configured flag
- `classSection` — years/sections configured counts

**Errors:** `400`, `401`, `404`, `500`

---

### 1.2 Get batch academic progression

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/session/batches/:id/academicProgression` |
| **Alt** | `/classSections/academicProgression?batchId=` |

**Path params**

| Name | Type | Required | Description |
|---|---|---|---|
| id | Integer | Yes | Batch ID |

**Response highlights**

- `terms[]` each with `term`, `termName`, `academicYear`, `status` (`Historical` \| `Current` \| `Future`), `configurationStatus` (`Verified` \| `Unverified`)
- `batch.setupStatus` — `Needs Setup` \| `Configured`

**Errors:** `400`, `401`, `404`, `500`

---

### 1.3 List batch students (paginated)

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/session/batches/:batchId/students` |

**Path params**

| Name | Type | Required | Description |
|---|---|---|---|
| batchId | Integer | Yes | Batch ID |

**Query params**

| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| page | Integer | No | 1 | Page number |
| limit | Integer | No | 10 | Page size (max 100) |
| search | String | No | — | Name / scholarNumber / enrollNumber |

**Response (data)**

- `batch`, `session`, `course`, `curriculum`, `currentYear`
- `studentCount`
- `students[]` — `firstName`, `middleName`, `lastName`, `enrollNumber`, `scholarNumber`, `batch`, `term`, `classSection`, `year`

**paginationData**

```json
{
  "page": 1,
  "limit": 10,
  "total": 120,
  "totalPages": 12
}
```

**Errors:** `400`, `401`, `404`, `500`

---

## 2. Main — Create class section

### 2.1 Create class section

| | |
|---|---|
| **Method** | `POST` |
| **Endpoint** | `/main/classSections` |
| **Auth** | Bearer token required |

**Headers**

| Header | Value |
|---|---|
| Authorization | Bearer `{{token}}` |
| Content-Type | application/json |

**Body**

```json
{
  "batchId": 1,
  "section": "1B",
  "year": 1
}
```

| Field | Type | Required | Nullable | Description |
|---|---|---|---|---|
| batchId | Integer | Yes | No | Batch entity ID |
| section | String | Yes | No | Section name (trimmed, min 1) |
| year | Integer | Yes | No | Programme year (1…courseDuration) |

**Business rules**

- `courseId` / `sessionId` come from the batch (do not send them).
- Creates `class_sections` + `class_section_term` rows for that year.
- Duplicate section name for same batch/year → `400`.

**Errors:** `400`, `401`, `403`, `404`, `500`

---

## 3. Class sections — rename / delete / overview

### 3.0 List class section batches

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/classSections/batches` |

**Query params**

| Name | Type | Required | Description |
|---|---|---|---|
| courseId | Integer | No | Programme filter |
| sessionId | Integer | No | Session filter |
| search | String | No | Search course / session / batch year |

**Response (data)**

- `activeCalendarYear`, `academicYear`
- `groups[]` — each programme+session group:
  - `courseId`, `courseName`, `sessionId`, `sessionName`
  - `activeBatchCount`, `activeSectionCount`
  - `batches[]`:
    - `batchId`, `batch`, `academicYears` (`2024 - 2029`)
    - `currentYear`, `currentYearLabel` (`Year 3`)
    - `currentTerms[]`, `currentTermsLabel` (`Semester 5 - Semester 6`)
    - `classSectionCount`, `studentCount`
    - `sections[]` — `classSectionsId`, `section`, `year`, `studentCount`
    - `sectionStatus` — `Configured` \| `Setup required` \| `Needs attention`

---

### 3.1 Rename class section

| | |
|---|---|
| **Method** | `PATCH` |
| **Endpoint** | `/classSections/section` |

**Body**

```json
{
  "classSectionId": 289,
  "section": "1BB"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| classSectionId | Integer | Yes | Class section PK |
| section | String | Yes | New section name |

**Errors:** `400`, `401`, `404`, `500`

---

### 3.2 Delete class section

| | |
|---|---|
| **Method** | `DELETE` |
| **Endpoint** | `/classSections/term?classSectionId=289` |

**Query params**

| Name | Type | Required | Description |
|---|---|---|---|
| classSectionId | Integer | Yes | Class section to delete |

**Business rules**

- Deletes class section + related terms.
- Blocked if students are still mapped to those terms.

**Errors:** `400`, `401`, `404`, `500`

---

## 4. Course — Terms with class sections

### 4.1 Get terms with class sections by batch

| | |
|---|---|
| **Method** | `GET` |
| **Endpoint** | `/course/termsWithClassSections` |

**Query params**

| Name | Type | Required | Description |
|---|---|---|---|
| batchId | Integer | Yes | Batch ID |
| year | Integer | No | Programme year filter |
| term | Integer | No | Programme term filter |

**Response highlights**

- `course`, `session`, `academicActiveYear`, `academicRegulations`
- `batch` with `years[]` — each year has `expectedTerms`, `classSections[]` (+ terms, studentCount)

**Errors:** `400`, `401`, `404`, `500`

---

## Changelog

### v1 (2026-09-23)

- Batch details / academic progression (session + classSections mounts)
- Class section create / rename / delete (batch-centric create)
- Course termsWithClassSections by `batchId`
- Batch students list with pagination
