# Grading Schemas API Documentation (Postman Collection Format)

**Base URL**: `{{baseurl}}/gradingSchemas`  
**Headers**:
- `Authorization`: `Bearer {{token}}`
- `Content-Type`: `application/json`

---

## 1. Grading Schema Operations

### 1.1 Create Grading Schema
- **Method**: `POST`
- **URL**: `{{baseurl}}/gradingSchemas`
- **Description**: Creates a new grading schema along with optional initial grade scales.

#### Request Body
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

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Grading schema created successfully",
  "data": {
    "gradingId": 1,
    "universityId": 2,
    "gradingName": "Standard 10-Point Grading Scale",
    "gradingCode": "G10_SCALE",
    "gradingMethod": "ABSOLUTE",
    "description": "Standard absolute grading scheme for undergraduate programs.",
    "status": "DRAFT",
    "isActive": true,
    "createdBy": 15,
    "updatedBy": 15,
    "created_at": "2026-07-31T00:30:00.000Z",
    "updated_at": "2026-07-31T00:30:00.000Z",
    "grades": [
      {
        "gradingGradeId": 101,
        "gradingId": 1,
        "grade": "O",
        "minPercentage": "90.00",
        "maxPercentage": "100.00",
        "gradePoint": "10.00",
        "resultLabel": "Outstanding",
        "remarks": "Excellent work",
        "sortOrder": 1,
        "isPass": true,
        "isActive": true,
        "created_at": "2026-07-31T00:30:00.000Z",
        "updated_at": "2026-07-31T00:30:00.000Z"
      }
    ]
  }
}
```

---

### 1.2 Get List of Grading Schemas
- **Method**: `GET`
- **URL**: `{{baseurl}}/gradingSchemas?search=&status=&gradingMethod=&page=1&limit=10`
- **Query Params**:
  - `search` *(optional)*: Filter by `gradingName` or `gradingCode` (e.g. `G10`)
  - `status` *(optional)*: Filter by status (`DRAFT` | `PUBLISHED`)
  - `gradingMethod` *(optional)*: Filter by method (`ABSOLUTE` | `RELATIVE`)
  - `page` *(optional, default: 1)*: Page number
  - `limit` *(optional, default: 10)*: Page size

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grading schemas fetched successfully",
  "data": {
    "totalRecords": 1,
    "totalPages": 1,
    "currentPage": 1,
    "pageSize": 10,
    "data": [
      {
        "gradingId": 1,
        "universityId": 2,
        "gradingName": "Standard 10-Point Grading Scale",
        "gradingCode": "G10_SCALE",
        "gradingMethod": "ABSOLUTE",
        "description": "Standard absolute grading scheme for undergraduate programs.",
        "status": "DRAFT",
        "isActive": true,
        "createdBy": 15,
        "updatedBy": 15,
        "created_at": "2026-07-31T00:30:00.000Z",
        "updated_at": "2026-07-31T00:30:00.000Z",
        "grades": [...]
      }
    ]
  }
}
```

---

### 1.3 Get Single Grading Schema by ID
- **Method**: `GET`
- **URL**: `{{baseurl}}/gradingSchemas/1`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grading schema fetched successfully",
  "data": {
    "gradingId": 1,
    "universityId": 2,
    "gradingName": "Standard 10-Point Grading Scale",
    "gradingCode": "G10_SCALE",
    "gradingMethod": "ABSOLUTE",
    "description": "Updated description",
    "status": "PUBLISHED",
    "isActive": true,
    "createdBy": 15,
    "updatedBy": 15,
    "created_at": "2026-07-31T00:30:00.000Z",
    "updated_at": "2026-07-31T00:30:00.000Z",
    "grades": [...]
  }
}
```

---

### 1.4 Update Grading Schema
- **Method**: `PUT`
- **URL**: `{{baseurl}}/gradingSchemas/1`
- **Description**: Updates grading schema details and optionally replaces full grade array.

#### Request Body
```json
{
  "gradingName": "Updated 10-Point Scale",
  "gradingCode": "G10_SCALE_V2",
  "gradingMethod": "ABSOLUTE",
  "description": "Updated grading scheme details",
  "status": "PUBLISHED"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grading schema updated successfully",
  "data": {
    "gradingId": 1,
    "gradingName": "Updated 10-Point Scale",
    "gradingCode": "G10_SCALE_V2",
    "status": "PUBLISHED",
    "updated_at": "2026-07-31T00:35:00.000Z"
  }
}
```

---

### 1.5 Delete Grading Schema
- **Method**: `DELETE`
- **URL**: `{{baseurl}}/gradingSchemas/1`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grading schema deleted successfully"
}
```

---

## 2. Grade-Level Operations

### 2.1 Add Grade to Schema
- **Method**: `POST`
- **URL**: `{{baseurl}}/gradingSchemas/1/grades`

#### Request Body
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

#### Response (201 Created)
```json
{
  "success": true,
  "message": "Grade created successfully",
  "data": {
    "gradingGradeId": 104,
    "gradingId": 1,
    "grade": "B+",
    "minPercentage": "70.00",
    "maxPercentage": "79.99",
    "gradePoint": "8.00",
    "resultLabel": "Very Good",
    "remarks": "Above average",
    "sortOrder": 4,
    "isPass": true,
    "isActive": true,
    "created_at": "2026-07-31T00:36:00.000Z",
    "updated_at": "2026-07-31T00:36:00.000Z"
  }
}
```

---

### 2.2 Get All Grades for a Schema
- **Method**: `GET`
- **URL**: `{{baseurl}}/gradingSchemas/1/grades`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grades fetched successfully",
  "data": [
    {
      "gradingGradeId": 101,
      "gradingId": 1,
      "grade": "O",
      "minPercentage": "90.00",
      "maxPercentage": "100.00",
      "gradePoint": "10.00",
      "resultLabel": "Outstanding",
      "sortOrder": 1,
      "isPass": true
    },
    {
      "gradingGradeId": 104,
      "gradingId": 1,
      "grade": "B+",
      "minPercentage": "70.00",
      "maxPercentage": "79.99",
      "gradePoint": "8.00",
      "resultLabel": "Very Good",
      "sortOrder": 4,
      "isPass": true
    }
  ]
}
```

---

### 2.3 Get Single Grade by ID
- **Method**: `GET`
- **URL**: `{{baseurl}}/gradingSchemas/1/grades/104`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grade fetched successfully",
  "data": {
    "gradingGradeId": 104,
    "gradingId": 1,
    "grade": "B+",
    "minPercentage": "70.00",
    "maxPercentage": "79.99",
    "gradePoint": "8.00",
    "resultLabel": "Very Good",
    "remarks": "Above average",
    "sortOrder": 4,
    "isPass": true,
    "isActive": true
  }
}
```

---

### 2.4 Update Single Grade
- **Method**: `PUT`
- **URL**: `{{baseurl}}/gradingSchemas/1/grades/104`

#### Request Body
```json
{
  "grade": "B+",
  "minPercentage": 65.0,
  "maxPercentage": 74.99,
  "gradePoint": 7.5,
  "resultLabel": "Good"
}
```

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grade updated successfully",
  "data": {
    "gradingGradeId": 104,
    "gradingId": 1,
    "grade": "B+",
    "minPercentage": "65.00",
    "maxPercentage": "74.99",
    "gradePoint": "7.50",
    "resultLabel": "Good",
    "updated_at": "2026-07-31T00:38:00.000Z"
  }
}
```

---

### 2.5 Delete Single Grade
- **Method**: `DELETE`
- **URL**: `{{baseurl}}/gradingSchemas/1/grades/104`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grade deleted successfully"
}
```

---

## 3. Schema Status Operations

### 3.1 Publish Grading Schema
- **Method**: `POST`
- **URL**: `{{baseurl}}/gradingSchemas/1/publish`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grading schema published successfully",
  "data": {
    "gradingId": 1,
    "status": "PUBLISHED",
    "updatedBy": 15,
    "updated_at": "2026-07-31T00:40:00.000Z"
  }
}
```

---

### 3.2 Save Grading Schema as Draft
- **Method**: `POST`
- **URL**: `{{baseurl}}/gradingSchemas/1/draft`

#### Response (200 OK)
```json
{
  "success": true,
  "message": "Grading schema saved as draft successfully",
  "data": {
    "gradingId": 1,
    "status": "DRAFT",
    "updatedBy": 15,
    "updated_at": "2026-07-31T00:41:00.000Z"
  }
}
```
