# Organogram (org) — Postman guide

**Collection:** [univ-v2-organogram.postman_collection.json](./univ-v2-organogram.postman_collection.json)  
**Naming / domain:** [ORGANOGRAM_NAMING_CONVENTION.md](../ORGANOGRAM_NAMING_CONVENTION.md)

**Base URL:** `http://localhost:8080` (`{{baseurl}}`)  
**Auth:** `Authorization: Bearer {{token}}`  
**Permissions:** `DEPARTMENT` / `DEPARTMENT_ADD` / `DEPARTMENT_EDIT` / `DEPARTMENT_DELETE`  
**Mount:** `/org`

---

## Suggested test order

| # | Method | Path | Purpose | Save |
|---|--------|------|---------|------|
| 0 | — | Login + tenant defaults | Get JWT | `token` |
| 1 | `GET` | `/departmentStructure/` | Pick structure node | `departmentStructureId` |
| 2 | `POST` | `/org/` | Create position (vacant OK) | `orgPositionId` |
| 3 | `GET` | `/org/single?orgPositionId=` | Verify position | — |
| 4 | `POST` | `/org/head` | Assign user as head | `orgPositionHeadId` |
| 5 | `GET` | `/org/head?orgPositionId=` | List heads | — |
| 6 | `GET` | `/org/` | List positions (+ heads) | — |
| 7 | `PATCH` | `/org/` | Update position fields | — |
| 8 | `PATCH` | `/org/head` | Update holder / status / dates | — |
| 9 | `POST` | `/org/markVacant` | Clear ACTIVE heads, vacant | — |
| 10 | `DELETE` | `/org/head?orgPositionHeadId=` | Remove one head | — |
| 11 | `DELETE` | `/org/?orgPositionId=` | Soft-delete position + heads | — |

---

## Endpoints

### Positions

| Method | Path | Body / query |
|--------|------|----------------|
| `POST` | `/org/` | `departmentStructureId`, `positionName`, `employmentCategory`, `level` (+ optional code, reportsTo, reportingType, isVacant, sortOrder) |
| `GET` | `/org/` | Optional: `departmentStructureId`, `employmentCategory`, `isVacant` |
| `GET` | `/org/single` | `orgPositionId` |
| `PATCH` | `/org/` | `orgPositionId` + fields to update (not `isVacant`) |
| `POST` | `/org/markVacant` | `{ "orgPositionId": 1 }` |
| `DELETE` | `/org/` | `orgPositionId` |

**`employmentCategory`:** `Academic` | `Administrative` | `Support` | `Executive` | `Leadership`

### Heads (`org_position_head`)

| Method | Path | Body / query |
|--------|------|----------------|
| `POST` | `/org/head` | `orgPositionId`, `userId`, `holderType`, optional `status`, `joiningDate`, `endDate` |
| `GET` | `/org/head` | `orgPositionId` |
| `PATCH` | `/org/head` | `orgPositionHeadId` + optional holder/status/dates |
| `DELETE` | `/org/head` | `orgPositionHeadId` |

**`holderType`:** `PRIMARY` | `ACTING`  
**`status`:** `ACTIVE` | `INACTIVE` (default on create: `ACTIVE`)

---

## Example bodies

### Create position

```json
{
  "departmentStructureId": 12,
  "positionName": "Head of Department",
  "positionCode": "HOD-CSE",
  "employmentCategory": "Academic",
  "reportsToOrgPositionId": null,
  "reportingType": "Direct",
  "isVacant": true,
  "sortOrder": 1,
  "level": 1
}
```

### Add head

```json
{
  "orgPositionId": 1,
  "userId": 44,
  "holderType": "PRIMARY",
  "status": "ACTIVE",
  "joiningDate": "2022-06-15",
  "endDate": null
}
```

---

## Vacancy rules

1. Create position → default `isVacant: true`.
2. First `ACTIVE` head → `isVacant = false`.
3. `markVacant` or no remaining `ACTIVE` heads → `isVacant = true`.

---

## Collection variables

| Variable | Use |
|----------|-----|
| `baseurl` | e.g. `http://localhost:8080` |
| `token` | JWT after login |
| `departmentStructureId` | From `/departmentStructure` |
| `orgPositionId` | Auto-set on create position |
| `orgPositionHeadId` | Auto-set on add head |
| `userId` | User to assign as head |

---

## Not the same as

| Table / API | Role |
|-------------|------|
| `/head` (`head` table) | Institute/campus head **contact** master |
| `hod_departments` | HOD **RBAC** map to `department` sub-units |
| `/org/head` (`org_position_head`) | Organogram position holder |
