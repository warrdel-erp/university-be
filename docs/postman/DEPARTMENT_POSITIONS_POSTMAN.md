
## Create order (folders in collection)

| # | Folder | Method | Path |
|---|--------|--------|------|
| 1 | department | `POST` | `/department/` |
| 2 | department positions | `POST` | `/departmentPosition/` |
| 3 | user department positions | `POST` | `/departmentPosition/head` |
| 2 | department positions | `GET` | `/departmentPosition/cards`, `/departmentPosition/tree`, `/departmentPosition/chart`, `/departmentPosition/departmentPositions` |

**Removed folder:** `2. department structure` — hierarchy is on `department.parentDepartmentId` only.

---

## Example bodies

### Department — Payload A (create root)
```json
{
  "departmentName": "School of Engineering",
  "departmentCode": "SOE",
  "departmentType": "Academic",
  "parentDepartmentId": null
}
```

### Department — Payload A (create child under parent)
```json
{
  "departmentName": "Computer Science",
  "departmentCode": "CSE",
  "departmentType": "Academic",
  "parentDepartmentId": 5
}
```

### Department — Payload B (insert parent above child)
```json
{
  "departmentId": 12,
  "departmentName": "Faculty of Engineering",
  "departmentCode": "FOE",
  "departmentType": "Admin"
}
```

Same endpoint `POST /department/` — when `departmentId` is sent, creates parent above that dept.

### Department (update)
```json
{
  "departmentId": 12,
  "departmentName": "School of Engineering",
  "departmentCode": "SOE",
  "departmentType": "Academic",
  "parentDepartmentId": 5
}
```

### Top position
```json
{
  "departmentId": 12,
  "positionName": "Chancellor",
  "employmentCategory": "Leadership",
  "level": 1
}
```

### Head
```json
{
  "departmentPositionId": 2,
  "userId": 44,
  "holderType": "PRIMARY",
  "status": "ACTIVE"
}
```

**Response shape:** `{ success, message, data }` — test scripts read `res.data`.

**Removed:** `/subAccount`, `/departmentStructure`, `accountId`, `subAccountId`, `departmentStructureId`, `hod_departments`.
