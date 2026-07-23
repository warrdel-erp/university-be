
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

