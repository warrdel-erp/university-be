# Curriculum Category APIs

Postman collection: `docs/postman/univ-v2-curriculum-category.postman_collection.json`

This module provides complete CRUD operations for managing `curriculum_category` master records.

| | |
|---|---|
| **Auth** | Bearer Token / Cookie (`accessToken={{token}}`) Required |
| **Base URL** | `{{baseurl}}` (default `http://localhost:8080`) |
| **Mount Paths** | `/curriculumCategory` and `/api/curriculum-categories` |

### Headers (all endpoints)

| Header | Required | Description |
|---|---|---|
| Authorization | Yes | `Bearer {{token}}` |
| Cookie | Optional | `accessToken={{token}}` |
| Content-Type | Yes (for POST/PATCH/PUT) | `application/json` |
| Accept | Yes | `application/json` |

---

## Database Table Schema: `curriculum_category`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique category ID |
| `category_name` | VARCHAR(150) | NOT NULL | Category name |
| `code` | VARCHAR(20) | NOT NULL, UNIQUE | Unique category code |
| `is_elective_coursework` | BOOLEAN | NOT NULL, DEFAULT TRUE | Elective flag |
| `description` | VARCHAR(250) | NULL | Optional description |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Created timestamp |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | Updated timestamp |

---

## API Summary

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/curriculumCategory` | Create a new curriculum category |
| `GET` | `/curriculumCategory` | List all curriculum categories with optional search, filter, and pagination |
| `GET` | `/curriculumCategory/:id` | Get details of a single curriculum category by path parameter |
| `GET` | `/curriculumCategory/single?id=` | Get details of a single curriculum category by query parameter |
| `PATCH` | `/curriculumCategory/:id` | Update category by path parameter |
| `PATCH` | `/curriculumCategory` | Update category by body (`id` included in body) |
| `DELETE` | `/curriculumCategory/:id` | Delete category by path parameter |
| `DELETE` | `/curriculumCategory?id=` | Delete category by query parameter |

---

## 1. Create Curriculum Category

- **HTTP Method:** `POST`
- **Endpoint:** `/curriculumCategory`
- **Description:** Creates a new curriculum category. `code` must be unique across all categories.

### Request Body
```json
{
  "categoryName": "Core Coursework",
  "code": "CC",
  "isElectiveCoursework": false,
  "description": "Compulsory core coursework curriculum courses"
}
```

### Fields
| Field | Type | Required | Nullable | Default | Description |
|---|---|---|---|---|---|
| `categoryName` (or `category_name`) | String (max 150) | Yes | No | - | Name of category |
| `code` | String (max 20) | Yes | No | - | Unique identifier code |
| `isElectiveCoursework` (or `is_elective_coursework`) | Boolean | No | No | `true` | Elective flag |
| `description` | String (max 250) | No | Yes | `null` | Remarks or description |

### Response (201 Created)
```json
{
  "success": true,
  "message": "Curriculum category created successfully",
  "data": {
    "id": 1,
    "categoryName": "Core Coursework",
    "code": "CC",
    "isElectiveCoursework": false,
    "description": "Compulsory core coursework curriculum courses",
    "createdAt": "2026-10-29T11:08:25.876Z",
    "updatedAt": "2026-10-29T11:08:25.876Z"
  }
}
```

---

## 2. Get All Curriculum Categories

- **HTTP Method:** `GET`
- **Endpoint:** `/curriculumCategory`
- **Description:** Returns curriculum categories. Supports searching by keyword (`categoryName`, `code`, or `description`), filtering by `isElectiveCoursework`, and pagination.

### Query Parameters
| Name | Type | Required | Default | Description |
|---|---|---|---|---|
| `search` | String | No | - | Search keyword |
| `isElectiveCoursework` | Boolean | No | - | Filter by `true` or `false` |
| `page` | Integer | No | 1 | Page number |
| `limit` | Integer | No | - | Records per page |

### Response (200 OK - Without Pagination)
```json
{
  "success": true,
  "message": "Curriculum categories fetched successfully",
  "data": [
    {
      "id": 1,
      "categoryName": "Core Coursework",
      "code": "CC",
      "isElectiveCoursework": false,
      "description": "Compulsory core coursework curriculum courses",
      "createdAt": "2026-10-29T11:08:25.876Z",
      "updatedAt": "2026-10-29T11:08:25.876Z"
    }
  ],
  "paginationData": null
}
```

### Response (200 OK - With Pagination)
```json
{
  "success": true,
  "message": "Curriculum categories fetched successfully",
  "data": [
    {
      "id": 1,
      "categoryName": "Core Coursework",
      "code": "CC",
      "isElectiveCoursework": false,
      "description": "Compulsory core coursework curriculum courses",
      "createdAt": "2026-10-29T11:08:25.876Z",
      "updatedAt": "2026-10-29T11:08:25.876Z"
    }
  ],
  "paginationData": {
    "total": 1,
    "page": 1,
    "limit": 10,
    "totalPages": 1
  }
}
```

---

## 3. Get Single Curriculum Category

- **HTTP Method:** `GET`
- **Endpoint:** `/curriculumCategory/:id` OR `/curriculumCategory/single?id=`

### Path Parameters / Query Parameters
| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | Integer | Yes | Category ID |

### Response (200 OK)
```json
{
  "success": true,
  "message": "Curriculum category fetched successfully",
  "data": {
    "id": 1,
    "categoryName": "Core Coursework",
    "code": "CC",
    "isElectiveCoursework": false,
    "description": "Compulsory core coursework curriculum courses",
    "createdAt": "2026-10-29T11:08:25.876Z",
    "updatedAt": "2026-10-29T11:08:25.876Z"
  }
}
```

---

## 4. Update Curriculum Category

- **HTTP Method:** `PATCH` or `PUT`
- **Endpoint:** `/curriculumCategory/:id` OR `/curriculumCategory` (with `id` in body)

### Request Body
```json
{
  "categoryName": "Core Coursework (Revised)",
  "isElectiveCoursework": false,
  "description": "Updated core curriculum syllabus description"
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Curriculum category updated successfully",
  "data": {
    "id": 1,
    "categoryName": "Core Coursework (Revised)",
    "code": "CC",
    "isElectiveCoursework": false,
    "description": "Updated core curriculum syllabus description",
    "createdAt": "2026-10-29T11:08:25.876Z",
    "updatedAt": "2026-10-29T11:15:30.123Z"
  }
}
```

---

## 5. Delete Curriculum Category

- **HTTP Method:** `DELETE`
- **Endpoint:** `/curriculumCategory/:id` OR `/curriculumCategory?id=`

### Response (200 OK)
```json
{
  "success": true,
  "message": "Curriculum category deleted successfully (ID 1)",
  "data": null
}
```

