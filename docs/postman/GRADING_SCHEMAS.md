# Grading Schemas — Postman API Guide

API endpoints for managing Grading Schemas and individual Grade Scales.  
**Mount:** `/gradingSchemas`  
**Auth:** Bearer `{{token}}`

---

## Endpoints Overview

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | `POST` | `/gradingSchemas` | Create a new grading schema |
| 2 | `GET` | `/gradingSchemas` | Get paginated list of grading schemas |
| 3 | `GET` | `/gradingSchemas/:gradingSchemaId` | Get single grading schema by ID |
| 4 | `PUT` | `/gradingSchemas/:gradingSchemaId` | Update grading schema |
| 5 | `DELETE` | `/gradingSchemas/:gradingSchemaId` | Delete grading schema |
| 6 | `POST` | `/gradingSchemas/grades/:gradingSchemaId` | Add a grade to a grading schema |
| 7 | `GET` | `/gradingSchemas/grades/:gradingSchemaId` | Get all grades of a grading schema |
| 8 | `GET` | `/gradingSchemas/grades/:gradingSchemaGradeId` | Get single grade by ID |
| 9 | `PUT` | `/gradingSchemas/grades/:gradingSchemaGradeId` | Update single grade |
| 10 | `DELETE` | `/gradingSchemas/grades/:gradingSchemaGradeId` | Delete single grade |
| 11 | `POST` | `/gradingSchemas/publish/:gradingSchemaId` | Set schema status to `PUBLISHED` |
| 12 | `POST` | `/gradingSchemas/draft/:gradingSchemaId` | Set schema status to `DRAFT` |

---

## Enums

| Field | Allowed Values |
|-------|----------------|
| `gradingMethod` | `ABSOLUTE`, `RELATIVE` |
| `status` | `DRAFT`, `PUBLISHED` |

---

## Example Payloads & Requests

### 1. Create Grading Schema (`POST /gradingSchemas`)
```json
{
  "gradingName": "Standard 10-Point Grading Scale",
  "gradingCode": "G10_SCALE",
  "gradingMethod": "ABSOLUTE",
  "maximumMarks": 100,
  "minimumPassingMarks": 40,
  "description": "Standard absolute grading scheme for undergraduate programs.",
  "status": "DRAFT",
  "isActive": true
}
```

### 2. Get All Grading Schemas (`GET /gradingSchemas?search=&status=&gradingMethod=&page=1&limit=10`)
Query Params:
- `search`: Filter by code or name
- `status`: `DRAFT` | `PUBLISHED`
- `gradingMethod`: `ABSOLUTE` | `RELATIVE`
- `page`: `1`
- `limit`: `10`

### 3. Update Grading Schema (`PUT /gradingSchemas/:gradingSchemaId`)
```json
{
  "gradingName": "Updated 10-Point Scale",
  "gradingCode": "G10_SCALE_V2",
  "gradingMethod": "ABSOLUTE",
  "maximumMarks": 100,
  "minimumPassingMarks": 35,
  "description": "Updated grading scheme details",
  "status": "DRAFT"
}
```

### 4. Add Grade to Schema (`POST /gradingSchemas/:gradingSchemaId/grades`)
```json
{
  "grade": "B+",
  "minPercentage": 70.0,
  "maxPercentage": 79.99,
  "gradePoint": 8.0,
  "resultLabel": "Very Good",
  "remarks": "Above average",
  "sortOrder": 4,
  "isPass": true,
  "isActive": true
}
```

### 5. Get Schema Grades (`GET /gradingSchemas/grades/:gradingSchemaId`)

### 6. Get Grade By ID (`GET /gradingSchemas/grades/:gradingSchemaGradeId`)

### 7. Update Single Grade (`PUT /gradingSchemas/grades/:gradingSchemaGradeId`)
```json
{
  "grade": "B+",
  "minPercentage": 65.0,
  "maxPercentage": 74.99,
  "gradePoint": 7.5,
  "resultLabel": "Good"
}
```

### 8. Delete Single Grade (`DELETE /gradingSchemas/grades/:gradingSchemaGradeId`)

### 9. Publish Grading Schema (`POST /gradingSchemas/publish/:gradingSchemaId`)

### 10. Save Grading Schema as Draft (`POST /gradingSchemas/draft/:gradingSchemaId`)
