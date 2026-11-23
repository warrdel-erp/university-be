# Leave Types Management APIs

Documentation for Leave Types Configuration, Usage & Eligibility Rules, Holidays & Carry Forward Rules, and Encashment Rules.

Postman Collection file: [`docs/postman/leave-types.postman_collection.json`](file:///d:/billing_schedule/university-be/docs/postman/leave-types.postman_collection.json)

---

## Overview

The Leave Types module acts as the master catalog for all leave varieties available within an institution (e.g. *Casual Leave, Sick Leave, Earned Leave, Maternity Leave, On Duty, Leave Without Pay*). 

Each Leave Type is composed of 4 configured areas:
1. **General / Basic Information & System Settings** (`leave_types` table)
2. **Usage & Eligibility Rules** (`leave_type_eligibility` table)
3. **Holidays & Carry Forward Rules** (`leave_type_holidays_carry_forward` table)
4. **Encashment Rules** (`leave_type_encashment` table)

---

## 1. Get All Leave Types (Listing View)

Returns the paginated list of leave types for the listing table. Includes search, classification, and status filtering along with the dynamic `usedInPoliciesCount`.

- **Method:** `GET`
- **URL:** `{{base_url}}/leave-types?page=1&limit=10&classification=All&status=All&search=`
- **Headers:** `Cookie: accessToken={{token}}`
- **Query Params:**
  - `page` (optional, default: `1`): Current page number.
  - `limit` (optional, default: `10`): Number of rows per page.
  - `classification` (optional, default: `'All'`): `'All'`, `'Paid'`, `'Unpaid'`, `'Duty'`.
  - `status` (optional, default: `'All'`): `'All'`, `'Active'`, `'Inactive'`, `'Draft'`, `'Published'`.
  - `search` (optional): Filter by leave name or code (e.g., `"CL"`).

### Response (200 OK)
```json
{
  "success": true,
  "total": 9,
  "page": 1,
  "limit": 10,
  "totalPages": 1,
  "data": [
    {
      "id": 1,
      "universityId": 1,
      "instituteId": 1,
      "campusId": null,
      "name": "Casual Leave",
      "code": "CL",
      "description": "For short-term personal needs.",
      "classification": "Paid",
      "trackBalance": true,
      "status": "Active",
      "usedInPoliciesCount": 3,
      "createdAt": "2026-11-16T12:00:00.000Z",
      "updatedAt": "2026-11-16T12:00:00.000Z",
      "eligibility": {
        "id": 1,
        "leaveTypeId": 1,
        "allowDuringProbation": true,
        "minServiceRequirement": false,
        "allowHalfDay": true,
        "minLeaveDuration": 0.5,
        "maxConsecutiveDays": 5,
        "maxDaysPerApplication": 5,
        "advanceNoticeMin": 1,
        "backdatedApplication": "Allowed with Limit",
        "backdatedLimit": 3,
        "futureApplicationLimit": 60,
        "requireSupportingDoc": true,
        "docRequirementRule": "Only When Leave Duration Is",
        "docRequiredAfterDays": 2,
        "acceptedDocTypes": "Medical Certificate, Prescription",
        "combinationRule": "No Restriction"
      },
      "holidaysCarryForward": {
        "id": 1,
        "leaveTypeId": 1,
        "applySandwichRule": true,
        "sandwichWeeklyOffs": true,
        "sandwichPublicHolidays": true,
        "unusedLeaveAction": "Carry to Next Period",
        "allowYearEndCarryForward": true,
        "carryForwardCalcType": "Percentage of Unused Balance",
        "carryForwardPercentage": 50,
        "transferCap": 30,
        "maxAccumulatedBalance": 60,
        "expiryAfterMonths": "After 12 months",
        "allowNegativeBalance": false,
        "maxNegativeBalance": 0,
        "requireAdditionalApproval": false
      },
      "encashment": {
        "id": 1,
        "leaveTypeId": 1,
        "allowEncashment": true,
        "applicableOn": "Both",
        "dsLimitMethod": "Fixed Days",
        "dsMaxEncashmentDays": 10,
        "dsMinBalanceToRetain": 10,
        "dsMinServiceRequirement": 12,
        "dsEncashmentFrequency": "Yearly",
        "sepLimitMethod": "Entire Eligible Balance",
        "sepMinServiceRequirement": 0
      }
    }
  ]
}
```

---

## 2. Get Single Leave Type by ID

Returns the complete configuration of a single leave type across all 4 sections.

- **Method:** `GET`
- **URL:** `{{base_url}}/leave-types/:id` *(or `{{base_url}}/leave-types/single?id=1`)*
- **Headers:** `Cookie: accessToken={{token}}`

### Response (200 OK)
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Casual Leave",
    "code": "CL",
    "description": "For short-term personal needs.",
    "classification": "Paid",
    "trackBalance": true,
    "status": "Active",
    "usedInPoliciesCount": 3,
    "eligibility": { ... },
    "holidaysCarryForward": { ... },
    "encashment": { ... }
  }
}
```

---

## 3. Create Leave Type (Default: Draft)

Creates a Leave Type along with its Eligibility, Holidays & Carry Forward, and Encashment child tables in a single transaction. Defaults to `"status": "Draft"` when not provided.

- **Method:** `POST`
- **URL:** `{{base_url}}/leave-types`
- **Headers:** `Content-Type: application/json`, `Cookie: accessToken={{token}}`

### Request Body
```json
{
  "name": "Casual Leave",
  "code": "CL",
  "description": "For short-term personal needs.",
  "classification": "Paid",
  "trackBalance": true,
  "status": "Draft",
  "eligibility": {
    "allowDuringProbation": true,
    "minServiceRequirement": false,
    "allowHalfDay": true,
    "minLeaveDuration": 0.5,
    "maxConsecutiveDays": 5,
    "maxDaysPerApplication": 5,
    "advanceNoticeMin": 1,
    "backdatedApplication": "Allowed with Limit",
    "backdatedLimit": 3,
    "futureApplicationLimit": 60,
    "requireSupportingDoc": true,
    "docRequirementRule": "Only When Leave Duration Is",
    "docRequiredAfterDays": 2,
    "acceptedDocTypes": "Medical Certificate, Prescription",
    "combinationRule": "No Restriction"
  },
  "holidaysCarryForward": {
    "applySandwichRule": true,
    "sandwichWeeklyOffs": true,
    "sandwichPublicHolidays": true,
    "unusedLeaveAction": "Carry to Next Period",
    "allowYearEndCarryForward": true,
    "carryForwardCalcType": "Percentage of Unused Balance",
    "carryForwardPercentage": 50,
    "transferCap": 30,
    "maxAccumulatedBalance": 60,
    "expiryAfterMonths": "After 12 months",
    "allowNegativeBalance": false,
    "maxNegativeBalance": 0,
    "requireAdditionalApproval": false
  },
  "encashment": {
    "allowEncashment": true,
    "applicableOn": "Both",
    "dsLimitMethod": "Fixed Days",
    "dsMaxEncashmentDays": 10,
    "dsMinBalanceToRetain": 10,
    "dsMinServiceRequirement": 12,
    "dsEncashmentFrequency": "Yearly",
    "sepLimitMethod": "Entire Eligible Balance",
    "sepMinServiceRequirement": 0
  }
}
```

### Response (201 Created)
```json
{
  "success": true,
  "message": "Leave type created successfully",
  "data": { ... }
}
```

---

## 4. Create / Save as Draft

Same as Create, but with `"status": "Draft"`.

- **Method:** `POST`
- **URL:** `{{base_url}}/leave-types`
- **Body:** Same as above with `"status": "Draft"`

---

## 5. Update Leave Type

Updates main leave type properties and upserts/updates any sub-rule tables.

> [!IMPORTANT]
> **Published Lock Rule**: Once a leave type is `"Published"`, it is locked and cannot be edited (`400 Bad Request: Cannot edit leave type because it is already published. Published leave types are locked from modifications.`). Only `"Draft"` leave types can be modified.

- **Method:** `PATCH`
- **URL:** `{{base_url}}/leave-types/:id` *(or body with `id`)*
- **Headers:** `Content-Type: application/json`, `Cookie: accessToken={{token}}`

### Request Body
```json
{
  "name": "Casual Leave (Updated)",
  "description": "For short-term personal needs updated.",
  "eligibility": {
    "maxConsecutiveDays": 7
  },
  "holidaysCarryForward": {
    "transferCap": 35
  },
  "encashment": {
    "dsMaxEncashmentDays": 15
  }
}
```

### Response (200 OK)
```json
{
  "success": true,
  "message": "Leave type updated successfully",
  "data": { ... }
}
```

---

## 6. Update Status (Publish / Draft / Active / Inactive)

Quick endpoint to change the lifecycle state of a leave type (e.g. from Draft to Published, or toggling Active/Inactive).

- **Method:** `PATCH`
- **URL:** `{{base_url}}/leave-types/:id/status` *(or `{{base_url}}/leave-types/status`)*
- **Headers:** `Content-Type: application/json`, `Cookie: accessToken={{token}}`

### Request Body
```json
{
  "status": "Published"
}
```

Allowed values: `"Active"`, `"Inactive"`, `"Draft"`, `"Published"`.

> [!NOTE]
> Once a leave type is `"Published"`, it cannot be reverted back to `"Draft"`. You may still toggle between `"Active"` and `"Inactive"` to control availability.

### Response (200 OK)
```json
{
  "success": true,
  "message": "Leave type status updated to 'Published' successfully",
  "data": { ... }
}
```

---

## 7. Delete Leave Type

Soft deletes the leave type. If the leave type is currently used by one or more leave policies, it will prevent deletion and return a safety warning unless `force=true` query parameter is passed.

- **Method:** `DELETE`
- **URL:** `{{base_url}}/leave-types/:id?force=false`
- **Headers:** `Cookie: accessToken={{token}}`

### Response (200 OK)
```json
{
  "success": true,
  "message": "Leave type deleted successfully"
}
```

### Response when in use by policies (400 Bad Request)
```json
{
  "success": false,
  "message": "Cannot delete leave type 'Casual Leave (CL)' because it is currently used in 3 leave policy/policies. Please remove it from the policies first, or pass force=true."
}
```
