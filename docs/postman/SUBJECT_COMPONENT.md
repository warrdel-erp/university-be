# Course / Subject Component APIs

Postman collection: `docs/postman/univ-v2-curriculum-category-and-components.postman_collection.json` (Folder: `2. Subject Component`)

This module provides complete CRUD operations for managing `subject_component` (Course / Subject Delivery Components such as Theory, Practical, Lab, Studio, Workshop, Seminar, Project).

Components are directly assigned to subjects when creating or updating a subject via:
- `POST /main/subject` (with `componentIds: [1, 2, 4]`)
- `PATCH /main/subject/update` (with `componentIds: [1, 4]`)

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

### 1. Subject Component Master (CRUD)
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

### 2. Mapping via Subject Creation / Updation
Components are assigned directly when adding or updating subjects:

#### Adding a Subject with Component IDs (`POST /main/subject`):
```json
{
  "courseId": 34,
  "subjectCode": "ARC101",
  "subjectName": "Architectural Design & Studio",
  "subjectType": "Major",
  "componentIds": [1, 4],
  "shortName": "ADS",
  "description": "Theory and Studio coursework"
}
```
*Response returns the created subject along with mapped `components`:*
```json
{
  "subjectId": 373,
  "subjectName": "Architectural Design & Studio",
  "subjectCode": "ARC101",
  "components": [
    { "id": 1, "componentName": "Theory", "code": "TH" },
    { "id": 4, "componentName": "Studio", "code": "ST" }
  ]
}
```

#### Updating a Subject's Components (`PATCH /main/subject/update`):
```json
{
  "subjectId": 373,
  "componentIds": [4, 5]
}
```
