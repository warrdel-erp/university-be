# Leave Policy Management APIs

Documentation for Leave Policy Creation, Leave Entitlements (CL, SL, EL), and Role/Employee Assignments.

Postman Collection file: [`docs/postman/leave-policies.postman_collection.json`](file:///d:/billing_schedule/university-be/docs/postman/leave-policies.postman_collection.json)

---

## 1. Get Roles Summary (For Role Assignment Table)
Returns all active roles with employee count and current leave policy summary.

- **Method:** `GET`
- **URL:** `{{base_url}}/leave-policies/roles-summary`
- **Headers:** `Cookie: accessToken={{token}}`

### Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "roleId": 12,
      "roleName": "Teacher",
      "roleCode": "SYS_TEACHER",
      "scope": "MY",
      "totalEmployees": 86,
      "assignmentSummary": "80 on Teaching Staff Leave Policy",
      "assignmentMode": "SELECTED",
      "selectedCount": 80,
      "effectiveFrom": "2026-07-01",
      "assignedPolicy": {
        "policyId": 1,
        "policyName": "Teaching Staff Leave Policy",
        "policyCode": "LPS-001"
      }
    },
    {
      "roleId": 14,
      "roleName": "Admin",
      "roleCode": "SYS_CLIENT_ADMIN",
      "scope": "UNIVERSITY",
      "totalEmployees": 54,
      "assignmentSummary": "All on Administrative Policy",
      "assignmentMode": "ALL",
      "selectedCount": 54,
      "effectiveFrom": "2026-07-01",
      "assignedPolicy": {
        "policyId": 2,
        "policyName": "Administrative Policy",
        "policyCode": "APS-001"
      }
    }
  ]
}
```

---

## 2. Get Role Employees (For "Select Employees" Side Drawer)
Returns employees belonging to a specific role with search and current policy details.

- **Method:** `GET`
- **URL:** `{{base_url}}/leave-policies/role-employees/:roleId?policyId=1&search=sharma`
- **Headers:** `Cookie: accessToken={{token}}`

### Response (200 OK)
```json
{
  "success": true,
  "roleId": 12,
  "totalEmployees": 86,
  "selectedCount": 80,
  "onOtherPoliciesCount": 6,
  "employees": [
    {
      "userId": 46,
      "employeeId": 26,
      "employeeCode": "EMP-0146",
      "name": "R. Sharma",
      "email": "sharma@example.com",
      "status": "Active",
      "currentPolicy": {
        "policyId": 1,
        "policyName": "Teaching Staff Leave Policy",
        "policyCode": "LPS-001"
      },
      "isSelected": true
    }
  ]
}
```

---

## 3. Create Leave Policy (Publish / Draft)
Creates main policy + multiple entitlements (CL, SL, EL) + role assignments in a single transaction.

- **Method:** `POST`
- **URL:** `{{base_url}}/leave-policies`
- **Headers:** `Content-Type: application/json`, `Cookie: accessToken={{token}}`

### Request Body
```json
{
  "policyName": "Teaching Staff Leave Policy",
  "policyCode": "LPS-001",
  "leaveYearType": "Academic Year (Jul - Jun)",
  "description": "Leave entitlement and rules for all teaching staff.",
  "effectiveFrom": "2026-07-01",
  "effectiveTo": null,
  "status": "Published",
  "leaveEntitlements": [
    {
      "leaveType": "Casual Leave (CL)",
      "leaveCode": "CL",
      "entitlementAnnual": 12,
      "creditMethod": "Monthly",
      "carryForward": true,
      "maxCarryForwardDays": 6,
      "maximumConsecutiveDays": 3,
      "keyRules": ["Probation", "Notice", "Half-day"],
      "status": "Configured"
    },
    {
      "leaveType": "Sick Leave (SL)",
      "leaveCode": "SL",
      "entitlementAnnual": 10,
      "creditMethod": "Monthly",
      "carryForward": true,
      "maxCarryForwardDays": 10,
      "maximumConsecutiveDays": 5,
      "keyRules": ["Notice", "Document Required", "Max Limit"],
      "status": "Configured"
    },
    {
      "leaveType": "Earned Leave (EL)",
      "leaveCode": "EL",
      "entitlementAnnual": 15,
      "creditMethod": "Monthly",
      "carryForward": true,
      "maxCarryForwardDays": 30,
      "keyRules": ["Encashment", "Carry Forward", "Min/Max"],
      "status": "Configured"
    }
  ],
  "roleAssignments": [
    {
      "roleId": 12,
      "assignmentMode": "SELECTED",
      "effectiveFrom": "2026-07-01",
      "selectedUserIds": [46, 47, 48]
    },
    {
      "roleId": 14,
      "assignmentMode": "ALL",
      "effectiveFrom": "2026-07-01",
      "selectedUserIds": []
    }
  ]
}
```

### Response (201 Created)
Returns complete policy with `entitlements` and `roleAssignments` (including `selectedEmployees`). If `status` is `"Published"`, automatically initializes `leave_balance` records for eligible users.

---

## 4. Get Leave Policies (Filtered by Role / Hybrid)
Fetches policies assigned to a role. Automatically applies hybrid filter (assignment_mode = ALL OR user exists in selectedEmployees).

- **Method:** `GET`
- **URL:** `{{base_url}}/leave-policies?roleId=12&all=false&ignoreEmployeeFilter=false`
- **Headers:** `Cookie: accessToken={{token}}`
- **Query Params:**
  - `roleId` (optional): Specific role ID. Defaults to logged-in user's role.
  - `all` (optional, boolean): Set `true` if Admin wants to view all policies across all roles.
  - `ignoreEmployeeFilter` (optional, boolean): Set `true` to view all policies of the role ignoring employee selection.

---

## 5. Get Single Leave Policy
- **Method:** `GET`
- **URL:** `{{base_url}}/leave-policies/single?policyId=1`
- **Headers:** `Cookie: accessToken={{token}}`

---

## 6. Update Leave Policy
- **Method:** `PATCH`
- **URL:** `{{base_url}}/leave-policies`
- **Headers:** `Content-Type: application/json`, `Cookie: accessToken={{token}}`

```json
{
  "policyId": 1,
  "policyName": "Updated Teaching Staff Leave Policy",
  "status": "Published"
}
```

---

## 7. Delete Leave Policy
- **Method:** `DELETE`
- **URL:** `{{base_url}}/leave-policies?policyId=1`
- **Headers:** `Cookie: accessToken={{token}}`

