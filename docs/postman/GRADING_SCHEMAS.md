# Grading Schemas — Postman API Guide

API endpoints for managing Grading Schemas and individual Grade Scales.  
**Mount:** `/gradingSchemas`  
**Auth:** Bearer `{{token}}`

---

## Endpoints Overview

| # | Method | Path | Description |
|---|--------|------|-------------|
| 1 | `POST` | `/gradingSchemas` | Create a new grading schema with optional grades |
| 2 | `GET` | `/gradingSchemas` | Get paginated list of grading schemas |
| 3 | `GET` | `/gradingSchemas/:gradingSchemaId` | Get single grading schema by ID |
| 4 | `PUT` | `/gradingSchemas/:gradingSchemaId` | Update grading schema |
| 5 | `DELETE` | `/gradingSchemas/:gradingSchemaId` | Delete grading schema |
| 6 | `POST` | `/gradingSchemas/:gradingSchemaId/grades` | Add a grade to a grading schema |
| 7 | `GET` | `/gradingSchemas/:gradingSchemaId/grades` | Get all grades of a grading schema |
| 8 | `GET` | `/gradingSchemas/:gradingSchemaId/grades/:gradingSchemaGradeId` | Get single grade by ID |
| 9 | `PUT` | `/gradingSchemas/:gradingSchemaId/grades/:gradingSchemaGradeId` | Update single grade |
| 10 | `DELETE` | `/gradingSchemas/:gradingSchemaId/grades/:gradingSchemaGradeId` | Delete single grade |
| 11 | `POST` | `/gradingSchemas/:gradingSchemaId/publish` | Set schema status to `PUBLISHED` |
| 12 | `POST` | `/gradingSchemas/:gradingSchemaId/draft` | Set schema status to `DRAFT` |

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
  "description": "Standard absolute grading scheme for undergraduate programs.",
  "status": "DRAFT",
  "isActive": true,
  "grades": [
    {
      "grade": "O",
      "minPercentage": 90.0,
      "maxPercentage": 100.0,
      "gradePoint": 10.0,
      "resultLabel": "Outstanding",
      "remarks": "Excellent work",
      "sortOrder": 1,
      "isPass": true,
      "isActive": true
    },
    {
      "grade": "A+",
      "minPercentage": 80.0,
      "maxPercentage": 89.99,
      "gradePoint": 9.0,
      "resultLabel": "Excellent",
      "remarks": "Very good performance",
      "sortOrder": 2,
      "isPass": true,
      "isActive": true
    },
    {
      "grade": "F",
      "minPercentage": 0.0,
      "maxPercentage": 39.99,
      "gradePoint": 0.0,
      "resultLabel": "Fail",
      "remarks": "Needs improvement",
      "sortOrder": 3,
      "isPass": false,
      "isActive": true
    }
  ]
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
  "description": "Updated grading scheme details",
  "status": "PUBLISHED"
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

### 5. Update Single Grade (`PUT /gradingSchemas/:gradingSchemaId/grades/:gradingSchemaGradeId`)
```json
{
  "grade": "B+",
  "minPercentage": 65.0,
  "maxPercentage": 74.99,
  "gradePoint": 7.5,
  "resultLabel": "Good"
}
```

### 6. Publish Grading Schema (`POST /gradingSchemas/:gradingSchemaId/publish`)
*(No request body required)*

### 7. Save Grading Schema as Draft (`POST /gradingSchemas/:gradingSchemaId/draft`)
*(No request body required)*
