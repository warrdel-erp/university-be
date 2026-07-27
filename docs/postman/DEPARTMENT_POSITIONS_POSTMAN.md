## Create order (folders in collection)

| # | Folder | Method | Path |
|---|--------|--------|------|
| 1 | department | `POST` | `/department/` |
| 2 | department positions | `POST` | `/departmentPosition/` |
| 3 | user department positions | `POST` | `/departmentPosition/head` |
| 2 | department positions | `GET` | `/departmentPosition/cards`, `/departmentPosition/tree`, `/departmentPosition/chart`, `/departmentPosition/departmentPositions` |

**Removed folder:** `2. department structure` — hierarchy is on `department.parentDepartmentId` only.

**Removed API:** `POST /departmentPosition/markVacant` — use `DELETE /departmentPosition/head` (sets `INACTIVE`).

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
  "level": 1,
  "isLevelHead": true
}
```

### Update level-head
```json
{
  "departmentPositionId": 2,
  "isLevelHead": true
}
```

### Head
```json
{
  "departmentPositionId": 2,
  "userId": 44,
  "joiningDate": "2024-01-01",
  "endDate": null
}
```

`status` is always `ACTIVE` on create (not accepted in payload).

### Relieve head (`DELETE /head`)
```
DELETE /departmentPosition/head?userDepartmentPositionId=9&endDate=2026-07-25
```

Sets `status=INACTIVE` and optional relieving `endDate`. INACTIVE rows are hidden from GETs.

**Response shape:** `{ success, message, data }` — test scripts read `res.data`.

**Enums**
- `employmentCategory`: Academic | Administrative | Support | Executive | Leadership
- head `status`: ACTIVE | INACTIVE

**Removed:** `/subAccount`, `/departmentStructure`, `accountId`, `subAccountId`, `departmentStructureId`, `hod_departments`, `POST /markVacant`, head `holderType`, `publishStatus`, `isVacant`.
