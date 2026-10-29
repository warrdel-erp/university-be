# Course / Subject Component APIs

Postman collection: `docs/postman/univ-v2-subject-component.postman_collection.json`

This module provides complete CRUD operations for managing `subject_component` (Course / Subject Delivery Components such as Theory, Practical, Lab, Studio, Workshop, Seminar, Project) and their many-to-many associations with subjects via `subject_component_mapping`.

| | |
|---|---|
| **Auth** | Bearer Token / Cookie (`accessToken={{token}}`) Required |
| **Base URL** | `{{baseurl}}` (default `http://localhost:8080`) |
| **Mount Paths** | `/subjectComponent`, `/api/subject-components`, `/courseComponent` |

### Headers (all endpoints)

| Header | Required | Description |
|---|---|---|
| Authorization | Yes | `Bearer {{token}}` |
| Cookie | Optional | `accessToken={{token}}` |
| Content-Type | Yes (for POST/PATCH/PUT) | `application/json` |
| Accept | Yes | `application/json` |

---

## Database Tables

### 1. `subject_component`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique component ID |
| `component_name` | VARCHAR(150) | NOT NULL | Component name (e.g. Studio, Theory) |
| `code` | VARCHAR(20) | NOT NULL, UNIQUE | Unique short code (e.g. ST, TH, PR) |
| `description` | VARCHAR(250) | NULL | Description (max 250 chars) |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Updated timestamp |

### 2. `subject_component_mapping`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Mapping record ID |
| `subject_id` | INT | NOT NULL, FK `subject(subject_id)` | Subject ID |
| `subject_component_id` | INT | NOT NULL, FK `subject_component(id)` | Subject Component ID |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Updated timestamp |

---

## API Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/subjectComponent` | Create a new component (e.g. Studio) |
| `GET` | `/subjectComponent` | List all components (includes `mappedSubjectsCount`) |
| `GET` | `/subjectComponent/:id` | Get component details by path param |
| `GET` | `/subjectComponent/single?id=` | Get component details by query param |
| `PATCH` | `/subjectComponent/:id` | Update component by path param |
| `PATCH` | `/subjectComponent` | Update component by body |
| `DELETE` | `/subjectComponent/:id` | Delete component (fails if mapped unless `?force=true`) |
| `DELETE` | `/subjectComponent?id=` | Delete component by query |
| `POST` | `/subjectComponent/map` | Assign components to a subject |
| `GET` | `/subjectComponent/subject/:subjectId` | Get all components mapped to a subject |
| `DELETE` | `/subjectComponent/subject/:subjectId/component/:componentId` | Unmap component from subject |

---

## 1. Create Subject Component

- **HTTP Method:** `POST`
- **Endpoint:** `/subjectComponent` (or `/courseComponent`)

### Request Body
```json
{
  "componentName": "Studio",
  "code": "ST",
  "description": "Studio-based design and drafting instruction"
}
```

### Fields
| Field | Type | Required | Description |
|---|---|---|---|
| `componentName` (or `component_name`, `name`) | String (max 150) | Yes | Name of the component |
| `code` | String (max 20) | Yes | Unique short code (e.g. ST, TH) |
| `description` | String (max 250) | No | Brief description |

### Response (201 Created)
```json
{
  "success": true,
  "message": "Subject component created successfully",
  "data": {
    "id": 4,
    "componentName": "Studio",
    "code": "ST",
    "description": "Studio-based design and drafting instruction",
    "createdAt": "2026-10-29T11:23:56.000Z",
    "updatedAt": "2026-10-29T11:23:56.000Z"
  }
}
```

---

## 2. Get All Subject Components

- **HTTP Method:** `GET`
- **Endpoint:** `/subjectComponent`
- **Description:** Returns all components along with `mappedSubjectsCount` (matching the course count in the UI cards).

### Response (200 OK)
```json
{
  "success": true,
  "message": "Subject components fetched successfully",
  "data": [
    {
      "id": 1,
      "componentName": "Theory",
      "code": "TH",
      "description": "Classroom-based theoretical instruction",
      "mappedSubjectsCount": 10,
      "createdAt": "2026-10-29T11:23:56.000Z",
      "updatedAt": "2026-10-29T11:23:56.000Z"
    },
    {
      "id": 2,
      "componentName": "Practical",
      "code": "PR",
      "description": "Practical coursework and laboratory application",
      "mappedSubjectsCount": 20,
      "createdAt": "2026-10-29T11:23:56.000Z",
      "updatedAt": "2026-10-29T11:23:56.000Z"
    }
  ],
  "paginationData": null
}
```

---

## 3. Assign Components to a Subject

- **HTTP Method:** `POST`
- **Endpoint:** `/subjectComponent/map` (or `/subjectComponent/subject/:subjectId`)

### Request Body
```json
{
  "subjectId": 129,
  "componentIds": [1, 2, 4]
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Components mapped to subject successfully",
  "data": [
    {
      "id": 45,
      "subjectId": 129,
      "subjectComponentId": 1,
      "component": {
        "id": 1,
        "componentName": "Theory",
        "code": "TH",
        "description": "Classroom-based theoretical instruction"
      }
    },
    {
      "id": 46,
      "subjectId": 129,
      "subjectComponentId": 4,
      "component": {
        "id": 4,
        "componentName": "Studio",
        "code": "ST",
        "description": "Studio-based design and drafting instruction"
      }
    }
  ]
}
```

---

## 4. Get Mapped Components for a Subject

- **HTTP Method:** `GET`
- **Endpoint:** `/subjectComponent/subject/:subjectId`

### Response (200 OK)
```json
{
  "success": true,
  "message": "Subject components fetched successfully",
  "data": {
    "subject": {
      "subjectId": 129,
      "subjectName": "Ecology & Built Environment",
      "subjectCode": "EBE101"
    },
    "components": [
      {
        "id": 1,
        "componentName": "Theory",
        "code": "TH",
        "description": "Classroom-based theoretical instruction"
      },
      {
        "id": 4,
        "componentName": "Studio",
        "code": "ST",
        "description": "Studio-based design and drafting instruction"
      }
    ]
  }
}
```

---

## 5. Unmap Component from Subject

- **HTTP Method:** `DELETE`
- **Endpoint:** `/subjectComponent/subject/:subjectId/component/:componentId`

### Response (200 OK)
```json
{
  "success": true,
  "message": "Component unmapped from subject successfully",
  "data": null
}
```

