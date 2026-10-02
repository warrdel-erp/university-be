# Deprecated Direct CRUD API Endpoints

This document catalogs all direct CRUD API endpoints associated with deprecated database tables that were mounted and handled directly via routers, controllers, services, and repositories.

---

## Summary of Deleted Direct CRUD Stacks

| Entity | Base Path | Router File | Controller File | Service File | Deprecated Database Table | Total Endpoints |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **Fee Group** | `/feeGroup` | `router/feeGroupRoute.js` | `controllers/feeGroupController.js` | `services/feeGroupServices.js` | `fee_group__deprecated` | 5 |
| **Fee Type** | `/feeType` | `router/feeTypeRoute.js` | `controllers/feeTypeController.js` | `services/feeTypeServices.js` | `fee_type__deprecated` | 5 |
| **Fee Plan** | `/feePlan` | `router/feePlanRoute.js` | `controllers/feePlanController.js` | `services/feePlanServices.js` | `fee_plan__deprecated` | 5 |
| **Fee Invoice** | `/feeInvoice` | `router/feeInvoiceRoute.js` | `controllers/feeInvoiceController.js` | `services/feeInvoiceServices.js` | `fee_invoice__deprecated` | 4 |
| **Fee Invoice Details** | `/feeInvoiceDetails` | `router/feeInvoiceDetailRoute.js` | `controllers/feeInvoiceDetailController.js` | `services/feeInvoiceDetailServices.js` | `fee_invoice_details__deprecated` | 5 |
| **Fee Invoice Record** | `/feeInvoiceRecord` | `router/feeInvoiceDetailRecordRoute.js` | `controllers/feeInvoiceDetailRecordController.js` | `services/feeInvoiceDetailRecordService.js` | `fee_invoice_detail_record__deprecated` | 5 |
| **Student Invoice** | `/studentInvoice` | `router/studentInvoiceRoute.js` | `controllers/studentInvoiceController.js` | `services/studentInvoiceService.js` | `student_invoice_mapper__deprecated` | 4 |

**Total Deleted Direct Endpoints**: **33**

---

## Detailed Endpoint Catalog

### 1. Fee Group (`/feeGroup`)
- **Deprecated Table**: `fee_group__deprecated`
- **Controller**: `controllers/feeGroupController.js`
- **Service**: `services/feeGroupServices.js`
- **Repository**: `repository/feeGroupRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/feeGroup` | `addFeeGroup` | Create a new fee group row |
| `GET` | `/feeGroup` | `getAllFeeGroup` | Get all fee groups (scoped by university, institute, academic year) |
| `GET` | `/feeGroup/single` | `getSingleFeeGroupDetails` | Get a single fee group by `feeGroupId` query parameter |
| `PATCH` | `/feeGroup` | `updateFeeGroup` | Update fee group details by `feeGroupId` |
| `DELETE` | `/feeGroup` | `deleteFeeGroup` | Soft-delete fee group by `feeGroupId` |

---

### 2. Fee Type (`/feeType`)
- **Deprecated Table**: `fee_type__deprecated`
- **Controller**: `controllers/feeTypeController.js`
- **Service**: `services/feeTypeServices.js`
- **Repository**: `repository/feeTypeRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/feeType` | `addFeeType` | Create fee type | `FEES_TYPE_ADD` |
| `GET` | `/feeType` | `getAllFeeType` | List fee types | `FEES_TYPE` |
| `GET` | `/feeType/single` | `getSingleFeeTypeDetails` | Get fee type by `feeTypeId` | `FEES_TYPE` |
| `PATCH` | `/feeType` | `updateFeeType` | Update fee type by `feeTypeId` | `FEES_TYPE_EDIT` |
| `DELETE` | `/feeType` | `deleteFeeType` | Delete fee type by `feeTypeId` | `FEES_TYPE_DELETE` |

---

### 3. Fee Plan (`/feePlan`)
- **Deprecated Table**: `fee_plan__deprecated`
- **Controller**: `controllers/feePlanController.js`
- **Service**: `services/feePlanServices.js`
- **Repository**: `repository/feePlanRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/feePlan` | `addFeePlan` | Create legacy fee plan with nested semester/type rows | `FEES_PLAN_ADD` |
| `GET` | `/feePlan` | `getAllFeePlan` | List all legacy fee plans | `FEES_PLAN` |
| `GET` | `/feePlan/single` | `getSingleFeePlanDetails` | Get legacy fee plan by `feePlanId` | `FEES_PLAN` |
| `PATCH` | `/feePlan` | `updateFeePlan` | Update legacy fee plan by `feePlanId` | `FEES_PLAN_EDIT` |
| `DELETE` | `/feePlan` | `deleteFeePlan` | Delete legacy fee plan by `feePlanId` | `FEES_PLAN_DELETE` |

---

### 4. Fee Invoice (`/feeInvoice`)
- **Deprecated Table**: `fee_invoice__deprecated`
- **Controller**: `controllers/feeInvoiceController.js`
- **Service**: `services/feeInvoiceServices.js`
- **Repository**: `repository/feeInvoiceRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/feeInvoice` | `addFeeInvoice` | Create a legacy fee invoice | `FEES_INVOICE_ADD` |
| `GET` | `/feeInvoice` | `getAllFeeInvoice` | List all legacy fee invoices | `FEES_INVOICE` |
| `GET` | `/feeInvoice/single` | `getSingleFeeInvoiceDetails` | Get single legacy invoice by `feeInvoiceId` | `FEES_INVOICE` |
| `GET` | `/feeInvoice/getInvoiceNumber` | `getInvoiceNumber` | Generate next sequential invoice number | `FEES_INVOICE` |

---

### 5. Fee Invoice Details (`/feeInvoiceDetails`)
- **Deprecated Table**: `fee_invoice_details__deprecated`
- **Controller**: `controllers/feeInvoiceDetailController.js`
- **Service**: `services/feeInvoiceDetailServices.js`
- **Repository**: `repository/feeInvoiceDetailsRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/feeInvoiceDetails` | `addFeeInvoiceDetails` | Add item details to legacy invoice |
| `GET` | `/feeInvoiceDetails` | `getAllFeeInvoiceDetails` | List invoice detail rows |
| `GET` | `/feeInvoiceDetails/single` | `getSingleFeeInvoiceDetails` | Get invoice detail row by `feeInvoiceDetailId` |
| `PATCH` | `/feeInvoiceDetails` | `updateFeeInvoiceDetails` | Update invoice detail row by `feeInvoiceDetailId` |
| `DELETE` | `/feeInvoiceDetails` | `deleteFeeInvoiceDetails` | Delete invoice detail row by `feeInvoiceDetailId` |

---

### 6. Fee Invoice Record (`/feeInvoiceRecord`)
- **Deprecated Table**: `fee_invoice_detail_record__deprecated`
- **Controller**: `controllers/feeInvoiceDetailRecordController.js`
- **Service**: `services/feeInvoiceDetailRecordService.js`
- **Repository**: `repository/feeInvoiceDetailRecordRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters |
| :--- | :--- | :--- | :--- |
| `POST` | `/feeInvoiceRecord` | `addFeeInvoiceDetailRecord` | Create detail record entry |
| `GET` | `/feeInvoiceRecord` | `getAllFeeInvoiceDetailRecord` | List all invoice detail records |
| `GET` | `/feeInvoiceRecord/single` | `getSingleFeeInvoiceDetailRecord` | Get single record by `feeInvoiceDetailRecordId` |
| `PATCH` | `/feeInvoiceRecord` | `updateFeeInvoiceDetailRecord` | Update record by `feeInvoiceDetailRecordId` |
| `DELETE` | `/feeInvoiceRecord` | `deleteFeeInvoiceDetailRecord` | Delete record by `feeInvoiceDetailRecordId` |

---

### 7. Student Invoice (`/studentInvoice`)
- **Deprecated Table**: `student_invoice_mapper__deprecated`
- **Controller**: `controllers/studentInvoiceController.js`
- **Service**: `services/studentInvoiceService.js`
- **Repository**: `repository/studentInvoiceRepository.js`

| Method | Full URL Path | Handler Function | Description / Parameters |
| :--- | :--- | :--- | :--- |
| `GET` | `/studentInvoice/count` | `getStudentCount` | Get count of active/inactive student fee statuses |
| `POST` | `/studentInvoice` | `activeInvoice` | Activate / assign fee plan to students |
| `POST` | `/studentInvoice/studentInvoice` | `addStudentSpecificInvoice` | Assign invoice to specific student |
| `GET` | `/studentInvoice` | `getAllActiveInvoice` | List all active student mapped invoices |

---

## Active Fee v2 Endpoints Retained (NOT Deprecated)
The following modern Fee v2 endpoints remain fully active and untouched:
- `/feeTypeCategory` ([feeTypeCategoryRoute.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/feeTypeCategoryRoute.js))
- `/feeTypeCatalog` ([feeTypeCatalogRoute.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/feeTypeCatalogRoute.js))
- `/feePlanItem` ([feePlanItemRoute.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/feePlanItemRoute.js))
- `/studentFeeInvoice` ([studentFeeInvoiceRoute.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/studentFeeInvoiceRoute.js))
- `/studentFeePayment` ([studentFeePaymentRoute.js](file:///c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/router/studentFeePaymentRoute.js))
