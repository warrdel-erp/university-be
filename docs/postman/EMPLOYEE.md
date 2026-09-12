# Employee Create & Update — API guide

Staff directory create / update APIs (+ Curriculum folder in the same collection).  
**Mount:** `/employee`  
**Postman collection:** [univ-v2-employee.postman_collection.json](./univ-v2-employee.postman_collection.json)  
**Deep table map:** [../EMPLOYEE_CREATE_UPDATE_TABLES.md](../EMPLOYEE_CREATE_UPDATE_TABLES.md)  
**Auth:** Bearer `{{token}}` (tenant from `saveUserDefaults`)

### Import
1. Postman → Import → `docs/postman/univ-v2-employee.postman_collection.json`
2. Set collection variables: `baseurl`, `token`, `employeeId`, `curriculumId`, `courseId`, `subjectId`, `batch`
3. Employee: **Add Employee** → **Update Employee**
4. Curriculum: Create → Map subjects → Publish → Map batch

---

## API list

| Method | Path | Permission | Purpose |
|--------|------|------------|---------|
| `POST` | `/employee/addEmp` | `STAFF_DIRECTORY_ADD` | Create employee (+ satellites) |
| `PATCH` | `/employee/:id` | `STAFF_DIRECTORY_EDIT` | Update employee (`:id` = employeeId or userId) |

---

## Curriculum APIs (same collection, folder `2. Curriculum`)

**Mount:** `/api/curriculums`  
**publishStatus:** `draft` | `published`

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/curriculums` | List |
| `GET` | `/api/curriculums/:id` | Detail + terms |
| `GET` | `/api/curriculums/:id/available-subjects` | Unmapped subjects |
| `GET` | `/api/curriculums/:id/batches` | Batch mappings + term rows |
| `GET` | `/api/curriculums/batches` | Batch year options |
| `POST` | `/api/curriculums` | Create (default draft) |
| `PATCH` | `/api/curriculums/:id` | Update name / isActive |
| `PATCH` | `/api/curriculums/:id/publish` | draft ↔ published |
| `DELETE` | `/api/curriculums/:id` | Delete |
| `POST` | `/api/curriculums/:id/map-subjects` | Map subjects (draft only) |
| `PATCH` | `/api/curriculums/addCredit/:mappingId` | Update credit/term (draft only) |
| `DELETE` | `/api/curriculums/subject-mappings/:mappingId` | Unmap subject (draft only) |
| `POST` | `/api/curriculums/:id/map-batch` | Map batch (published only; terms auto-created) |
| `DELETE` | `/api/curriculums/batch-mappings/:mappingId` | Unmap batch (terms auto-deleted) |

---

## Authentication

Bearer token required.

### Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | `Bearer {{token}}` |
| `Content-Type` | Yes | `application/json` |

---

## 1. Add Employee

### HTTP Method
`POST`

### Endpoint
`POST /employee/addEmp`

### Description
Creates auth user + employee master row and optional satellite records (address, office, skills, documents, qualifications, experience, etc.) in one transaction.

- Only **`employeeName`** is required by Zod.
- `campusId` / `instituteId` / `employeeCode` / `userId` are **auto-set** — do not send.
- `roleId` is optional (managed via user roles; `employee.role_id` stays null).
- Code-master FKs must be real `employee_code_master_type_id` values for your tenant DB.

### Request body (Postman-ready)

```json
{
  "employeeName": "John Doe",
  "employmentType": "Permanent",
  "dateOfBirth": "1990-05-15",
  "fatherName": "Robert Doe",
  "motherName": "Jane Doe",
  "pickColor": "#4A90E2",
  "salutation": "Mr",
  "designation": "Assistant Professor",
  "officialEmailId": "john.doe@university.edu",
  "officialMobileNumber": "9876543210",
  "address": {
    "pAddress": "12 MG Road",
    "pPincode": 110001,
    "pCountry": "India",
    "pState": "Delhi",
    "pCity": "New Delhi",
    "mobileNumber": "9876543210",
    "personalEmail": "john.personal@gmail.com"
  },
  "corsAddress": {
    "address": "Flat 4B, Hostel Road",
    "pincode": 110002,
    "cCountry": 1,
    "cState": 10,
    "cCity": 100
  },
  "office": {
    "joiningDate": "2020-01-15",
    "confirmationDate": "2021-01-15",
    "relievingDate": null,
    "retirementDate": null,
    "transferDate": null,
    "resignationDate": null,
    "noticePeriod": 30,
    "employeeFileNumber": "EMP-FILE-001",
    "officialEmailId": "john.doe@university.edu",
    "officialMobileNumber": "9876543210",
    "istActive": true,
    "bankName": "SBI",
    "accountNumber": "1234567890",
    "ifscCode": "SBIN0001234",
    "iindActive": false,
    "bankNameIInd": null,
    "accountNumberIInd": null,
    "ifscCodeIInd": null,
    "contractBased": false,
    "gpf": "GPF001",
    "esiNumber": "ESI001",
    "uanNumber": "UAN001",
    "lectureBased": false,
    "pfNumber": "PF001",
    "panNumber": "ABCDE1234F",
    "voterId": "VOTER123",
    "aadharNumber": "123456789012",
    "spouseName": "Mary Doe",
    "nomineeName": "Robert Doe",
    "officeExtensionNumber": "2345",
    "employeeRank": "Assistant Professor"
  },
  "skill": [
    {
      "name": "Java",
      "experienceInYear": 5,
      "experienceInMonth": "6",
      "proficiencyLevel": 235
    }
  ],
  "documents": [
    {
      "document": 238,
      "receivedDate": "2024-01-10",
      "returnedDate": null
    }
  ],
  "qualification": [
    {
      "qualifications": 213,
      "degreeLevel": 219,
      "fromYear": "2010-01-01",
      "toYear": "2014-01-01",
      "university": "Delhi University",
      "percentage": "78",
      "remarks": null,
      "pursuing": false,
      "medicalCouncilName": null,
      "medicalRegistrationNumber": null,
      "medicalCouncilRegistrationDate": null,
      "medicalRegistrationExpiryDate": null
    }
  ],
  "experience": [
    {
      "experienceType": 210,
      "organization": "ABC College",
      "desigation": "Lecturer",
      "fromDate": "2015-06-01",
      "toDate": "2019-12-31",
      "totalExperianceYears": 4,
      "totalExperianceMonths": 6,
      "totalExperiancedays": 0,
      "lastSalary": 45000,
      "remarks": null
    }
  ],
  "achievements": [
    {
      "achievementCategory": 245,
      "title": "Best Teacher Award",
      "description": "Department award",
      "noOfTimes": 1,
      "discipline": "CS",
      "nameOf": "University Awards",
      "date": "2023-03-15"
    }
  ],
  "ward": [
    {
      "wardName": "Sam Doe",
      "studyIn": "Class 10",
      "annualFees": 50000,
      "dateOfBirth": "2012-08-20"
    }
  ],
  "activity": [
    {
      "activity": "NCC Coordinator",
      "monthYear": "2024-01-01",
      "remarks": "Campus activity"
    }
  ],
  "reference": [
    {
      "name": "Dr. Sharma",
      "designation": "HOD",
      "mobileNumber": "9988776655",
      "address": "Campus Block A"
    }
  ],
  "research": [
    {
      "thesisName": "ML in Education",
      "associate": "Dr. Kumar",
      "periodFrom": "2018-01-01",
      "to": "2020-12-31",
      "institution": "IIT Delhi"
    }
  ],
  "longLeave": [
    {
      "leaveType": 254,
      "DateOfLeaving": "2022-06-01",
      "DateOfRejoining": "2022-12-01",
      "remark": "Sabbatical"
    }
  ]
}
```

### Optional file ID fields (commented in payloads)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `employeePhoto` | Integer | No | `s3_files.id` |
| `employeeSignature` | Integer | No | `s3_files.id` |
| `documents[].attachment` | Integer | No | `s3_files.id` |
| `departmentId` | Integer | No | `department.department_id` |
| `roleId` | Integer | No | Assigned via user roles flow |
| `files` | Array | No | `{ key, url }` → `employee_files` |
| `allDropDownData` | Object | No | `{ type: [], code: [] }` → `employee_meta_data` |

### Payload key → table map

| Payload key | Table |
|-------------|-------|
| top-level personal fields | `employee` |
| `address` | `employee_address` |
| `corsAddress` | `employee_cor_address` |
| `office` + top-level official email/mobile | `employee_office` (+ `users.email` sync) |
| `skill` | `employee_skill` |
| `documents` | `employee_qualification` (needs `receivedDate`) |
| `qualification` | `employee_documents` (needs `qualifications` + `degreeLevel`) |
| `experience` | `employee_experiance` |
| `achievements` | `employee_achievements` |
| `ward` | `employee_ward` |
| `activity` | `employee_activity` |
| `reference` | `employee_reference` |
| `research` | `employee_research` |
| `longLeave` | `employee_long_leave` |

### Code-master ID examples (local DB)

| Field | Example IDs |
|-------|-------------|
| `skill.proficiencyLevel` | `234` Beginner, `235` Intermediate, `236` Advanced, `237` Expert |
| `documents.document` | `238` Aadhaar, `239` PAN, `243` Marksheet, `244` Degree Certificate |
| `qualification.qualifications` | `213` UG, `214` PG, `215` Ph.D. |
| `qualification.degreeLevel` | `219` UG, `220` PG, `221` Ph.D. |
| `experience.experienceType` | `210` Teaching, `211` Professional |
| `achievements.achievementCategory` | `245` Academic … `250` Other |
| `longLeave.leaveType` | `254` Sabbatical, `251` Medical Leave |

> Stream master may be empty — omit `qualification.stream` (service falls back to `degreeLevel`).

### Success response

```json
{
  "success": true,
  "message": "Employee added successfully",
  "data": {}
}
```

### Error codes

| Status | Reason |
|--------|--------|
| 400 | Validation / invalid JSON |
| 401 | Unauthorized |
| 403 | Forbidden (missing permission) |
| 409 / 500 | FK failure (invalid code-master id) / DB error |

### Business rules

- Placeholder IDs like `1` will fail FK (`employee_code_master_type`).
- `documents` and `qualification` names are swapped vs table names (see map above).
- Spellings match DB models: `desigation`, `totalExperianceYears`, `DateOfLeaving`, `DateOfRejoining`.
- Do not send `campusId`, `instituteId`, `employeeCode`, `userId`.

---

## 2. Update Employee

### HTTP Method
`PATCH`

### Endpoint
`PATCH /employee/:id`

### Description
Updates employee and satellites. `:id` may be **employeeId** or **userId** (resolved via scoped lookup).

All body fields are optional. Sending nested arrays (`skill`, `documents`, `qualification`, etc.) typically **refreshes** that child set for the employee.

### Path parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | Integer | Yes | `employeeId` or `userId` |

### Request body
Same shape as Add Employee. Minimal example:

```json
{
  "employeeName": "John Doe Updated",
  "officialEmailId": "john.updated@university.edu",
  "officialMobileNumber": "9876543210",
  "office": {
    "employeeRank": "Associate Professor",
    "noticePeriod": 60
  },
  "address": {
    "pAddress": "12 MG Road, Updated",
    "pPincode": 110001,
    "pCountry": "India",
    "pState": "Delhi",
    "pCity": "New Delhi",
    "mobileNumber": "9876543210",
    "personalEmail": "john.personal@gmail.com"
  },
  "skill": [
    {
      "name": "Python",
      "experienceInYear": 3,
      "experienceInMonth": "0",
      "proficiencyLevel": 236
    }
  ]
}
```

### Success response

```json
{
  "success": true,
  "message": "Employee updated successfully",
  "data": {}
}
```

### Error codes

| Status | Reason |
|--------|--------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Employee not found for `:id` |
| 500 | DB / FK error |

### Business rules

- Empty `documents` / `qualification` arrays on update can clear those child rows.
- `officialEmailId` syncs to `users.email` when provided.
- `campusId` / `instituteId` in body are ignored on update.

---

## Sample flow

```
Login → get token
↓
POST /employee/addEmp
↓
Save employeeId → {{employeeId}}
↓
PATCH /employee/{{employeeId}}
```

---

## Changelog

### v1 — 2026-09-12
- New Postman collection + guide for Add / Update Employee.
- Payload keys aligned to models; code-master IDs from local DB.
- Contact fields live on `employee_office` (`officialEmailId`, `officialMobileNumber`).
- `corsAddress` uses `address` / `pincode` (not `cAddress` / `cPincode`).
