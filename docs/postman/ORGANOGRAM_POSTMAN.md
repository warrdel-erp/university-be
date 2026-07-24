
## Create order (folders in collection)

| # | Folder | Method | Path |
|---|--------|--------|------|
| 1 | department | `POST` | `/department/` |
| 2 | department structure | `POST` | `/departmentStructure/` |
| 3 | org positions | `POST` | `/org/` (top then child) |
| 4 | org heads | `POST` | `/org/head` |
| — | org positions | `GET` | `/org/cards` |

---

## Example bodies

### Department
```json
{
  "departmentName": "School of Engineering",
  "departmentCode": "SOE"
}
```

### Structure
```json
{ "departmentId": 12, "parentDepartmentId": null }
```

### Top position
```json
{
  "departmentStructureId": 1,
  "departmentId": 12,
  "positionName": "Chancellor",
  "employmentCategory": "Leadership",
  "level": 1,
  "reportsToOrgPositionId": null
}
```

### Child position
```json
{
  "departmentStructureId": 1,
  "departmentId": 12,
  "positionName": "Vice Chancellor",
  "employmentCategory": "Leadership",
  "level": 2,
  "reportsToOrgPositionId": 1
}
```

### Head
```json
{
  "orgPositionId": 2,
  "userId": 44,
  "holderType": "PRIMARY",
  "status": "ACTIVE"
}
```

**Removed:** `/subAccount`, `accountId`, `subAccountId`, department `parentDepartmentId` / `departmentOrder` / soft-delete.
