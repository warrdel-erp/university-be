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
| 1 | `POST` | `/departmentStructure/` | Create structure (root: `subAccountId` + `parentAccountId` may be `null`) | `departmentStructureId` |
| 2 | `GET` | `/departmentStructure/` | List / pick structure node | `departmentStructureId` |
| 3 | `POST` | `/org/` | Create position (vacant OK) | `orgPositionId` |
| 3b | `GET` | `/org/cards` | Summary KPI cards | — |
| 4 | `GET` | `/org/single?orgPositionId=` | Verify position | — |
| 5 | `POST` | `/org/head` | Assign user as head | `orgPositionHeadId` |
| 6 | `GET` | `/org/head?orgPositionId=` | List heads | — |
| 7 | `GET` | `/org/` | List positions (+ heads) | — |
| 8 | `PATCH` | `/org/` | Update position fields | — |
| 9 | `PATCH` | `/org/head` | Update holder / status / dates | — |
| 10 | `POST` | `/org/markVacant` | Clear ACTIVE heads, vacant | — |
| 11 | `DELETE` | `/org/head?orgPositionHeadId=` | Remove one head | — |
| 12 | `DELETE` | `/org/?orgPositionId=` | Soft-delete position + heads | — |

### Department structure

| Method | Path | Body |
|--------|------|------|
| `POST` | `/departmentStructure/` | Required: `accountId`. `subAccountId` and `parentAccountId` may both be `null` (top root). Self-parent: set both to the same id. |
| `GET` | `/departmentStructure/` | — |

```json
{
  "accountId": 1,
  "subAccountId": null,
  "parentAccountId": null
}
```

---

## Endpoints

### Positions

| Method | Path | Body / query |
|--------|------|----------------|
| `GET` | `/org/cards` | Organogram summary cards (total / filled / vacant / departments / reporting levels) |
| `POST` | `/org/` | `departmentStructureId`, `positionName`, `employmentCategory`, `level` (+ optional `subAccountId`, code, reportsTo, reportingType, isVacant, sortOrder) |
| `GET` | `/org/` | Optional: `departmentStructureId`, `subAccountId`, `employmentCategory`, `isVacant` |
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
  "subAccountId": 5,
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
