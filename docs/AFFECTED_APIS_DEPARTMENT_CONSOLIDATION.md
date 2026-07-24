# Organogram & department — API routes

## Current routes

| Method | URL |
|---|---|
| `POST` | `/department/` |
| `GET` | `/department/` |
| `GET` | `/department/single?departmentId=` |
| `PATCH` | `/department/` |
| `DELETE` | `/department/?departmentId=` |
| `GET` | `/department/byId?departmentId=` |
| `POST` | `/departmentStructure/` |
| `GET` | `/departmentStructure/` |
| `GET` | `/departmentStructure/single?departmentStructureId=` |
| `PATCH` | `/departmentStructure/` |
| `DELETE` | `/departmentStructure/?departmentStructureId=` |
| `GET` | `/org/cards` |
| `POST` | `/org/` |
| `GET` | `/org/` |
| `GET` | `/org/single?orgPositionId=` |
| `PATCH` | `/org/` |
| `POST` | `/org/markVacant` |
| `DELETE` | `/org/?orgPositionId=` |
| `POST` | `/org/head` |
| `GET` | `/org/head?orgPositionId=` |
| `PATCH` | `/org/head` |
| `DELETE` | `/org/head?orgPositionHeadId=` |

---

## Replace these APIs

| Old | Replace with |
|---|---|
| `POST /subAccount/` | `POST /department/` |
| `GET /subAccount/` | `GET /department/` |
| `GET /subAccount/single?subAccountId=` | `GET /department/single?departmentId=` |
| `PATCH /subAccount/` | `PATCH /department/` |
| `DELETE /subAccount/?subAccountId=` | `DELETE /department/?departmentId=` |

| `GET /subAccount/account` | `GET /department/` |


| `GET /department/roots` | removed — use `GET /department/` |
| `POST /departmentStructure/` with `accountId`, `subAccountId`, `parentAccountId` | `POST /departmentStructure/` with `departmentId`, `parentDepartmentId` |
| `POST /org/` with `subAccountId` | `POST /org/` with `departmentId` |
| `GET /org/?subAccountId=` | `GET /org/?departmentId=` |
| `PATCH /org/` with `subAccountId` | `PATCH /org/` with `departmentId` |
| `GET /calendar/department/:subAccountId` (jobs) | `GET /calendar/department/:departmentId` |
| Course / intake body `subAccountId` | `departmentId` (legacy `subAccountId` alias may still work) |


| `hod_departments` / HOD RBAC table | `POST /org/head` on position with `departmentId` |

---

## Replace these keys

| Old key | New key |
|---|---|
| `subAccountId` | `departmentId` |
| `accountId` | removed (use `departmentId`) |
| `parentAccountId` (structure) | `parentDepartmentId` |
| `parentDepartmentId` (on `/department`) | removed |
| `departmentOrder` | removed |
