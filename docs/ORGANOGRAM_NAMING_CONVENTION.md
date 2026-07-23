# Org (organogram) & department naming convention

> After consolidation: **`department` is the only org-unit table**. `account` and `sub_account` are removed.

## Locked decisions

- Use **`department`** as the org unit (CSE, Exam Cell, Academics group, etc.).
- Hierarchy for org chart is via **`org_position.reportsToOrgPositionId`** (and structure `parentDepartmentId` when used).
- Short prefix **`org`** for organogram tables/APIs.
- Position holders live in **`org_position_head`** via **`user_id`**.
- `department` and `department_structure` use **hard delete** (no `paranoid` / `deleted_at`).

## Current meaning

| Table / route | What it is |
|---|---|
| `department` / `/department` | Org unit (was `sub_account` + `account` + old sub-units) |
| `department_structure` / `/departmentStructure` | Organogram tree edges (`departmentId` / `parentDepartmentId`) |
| `org_position` | Designation / seat |
| `org_position_head` | User holding a seat |
| `hod_departments` | **Removed** — department RBAC now from ACTIVE `org_position_head` → `org_position.departmentId` |
| `head` / `/head` | Campus contact master (unrelated) |

## Relationship

```
department
  ├── department_structure
  │     ├── department_id
  │     └── parent_department_id
  └── org_position
        ├── department_id
        ├── reports_to_org_position_id
        └── org_position_head (user_id)
```

## API prefixes

- `/department` — org unit CRUD
- `/departmentStructure` — tree CRUD
- `/org` — positions + heads + cards
- **Removed:** `/subAccount`

## Breaking change doc

See [AFFECTED_APIS_DEPARTMENT_CONSOLIDATION.md](./AFFECTED_APIS_DEPARTMENT_CONSOLIDATION.md).

**Postman:** [univ-v2-organogram.postman_collection.json](./postman/univ-v2-organogram.postman_collection.json)
