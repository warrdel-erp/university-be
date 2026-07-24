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
| `GET` | `/departmentPosition/cards` |
| `POST` | `/departmentPosition/` |
| `GET` | `/departmentPosition/` |
| `GET` | `/departmentPosition/single?departmentPositionId=` |
| `PATCH` | `/departmentPosition/` |
| `POST` | `/departmentPosition/markVacant` |
| `DELETE` | `/departmentPosition/?departmentPositionId=` |
| `POST` | `/departmentPosition/head` |
| `GET` | `/departmentPosition/head?departmentPositionId=` |
| `PATCH` | `/departmentPosition/head` |
| `DELETE` | `/departmentPosition/head?userDepartmentPositionId=` |

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
| `POST /departmentStructure/` | removed — use `POST /department/` with `parentDepartmentId` |
| `GET /departmentStructure/` | removed — use `GET /department/` |
| `POST /departmentPosition/` with `subAccountId` | `POST /departmentPosition/` with `departmentId` |
| `GET /departmentPosition/?subAccountId=` | `GET /departmentPosition/?departmentId=` |
| `PATCH /departmentPosition/` with `subAccountId` | `PATCH /departmentPosition/` with `departmentId` |
| `GET /calendar/department/:subAccountId` (jobs) | `GET /calendar/department/:departmentId` |
| Course / intake body `subAccountId` | `departmentId` (legacy `subAccountId` alias may still work) |


| `hod_departments` / HOD RBAC table | `POST /departmentPosition/head` on position with `departmentId` |

---

## Replace these keys

| Old key | New key |
|---|---|
| `subAccountId` | `departmentId` |
| `accountId` | removed (use `departmentId`) |
| `parentAccountId` (structure) | `parentDepartmentId` on `department` |
| `departmentOrder` | removed |
