
## Current meaning

| Table / route | What it is |
|---|---|
| `department` / `/department` | Org unit + hierarchy via `parentDepartmentId` |
| `department_positions` | Designation / seat |
| `user_department_positions` | User holding a seat |
| `hod_departments` | **Removed** — department RBAC now from ACTIVE `user_department_positions` → `department_positions.departmentId` |
| `head` / `/head` | Campus contact master (unrelated) |

## Relationship

```
department (parentDepartmentId → parent department)
  └── department_positions
        ├── department_id
        └── user_department_positions (user_id)
```

## API prefixes

- `/department` — org unit CRUD + hierarchy (`parentDepartmentId`)
- `/departmentPosition` — positions, user assignments, cards, tree, chart
- **Removed:** `/subAccount`, `/departmentStructure`
