# 📚 University ERP - Backend Module Separation Architecture Guide

> **Document Purpose:** Yeh document poore backend project ke **Module Separation** ka complete map aur reference guide hai. Isse padh kar koi bhi developer ya team member asani se samajh sakta hai ki kaun si file kis module me hai, kaun se modules complete ho chuke hain, aur baaki files ka future plan kya hai.

---

## 📊 Live Migration Progress Scorecard

> **Last Updated:** Current Session  
> **Architecture Pattern:** Feature-Driven Modular Monolith (Express.js + Sequelize)

| Metric | Status | Details |
|---|:---:|---|
| 🎯 **Total Modules** | **13** | Total planned independent domain modules |
| ✅ **Completed Modules** | **7** | `dormitory`, `transport`, `library`, `asset-management`, `organization`, `hrms`, `timetable` |
| ⏳ **Remaining Modules** | **6** | `iam`, `finance`, `student`, `academics`, `examination`, `shared` |
| 📈 **Overall Completion** | **54%** | **7 / 13 modules separated & verified in `app.js`** |
| 🚀 **Next In Queue** | **`08. iam`** | Auth, Users, Roles, Permissions, SubAccounts |

### Visual Progress:
```text
[█████████████░░░░░░░░░░░] 54% (7 of 13 Modules Completed)
```

---

## 📑 Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Standard Module Pattern](#2-standard-module-pattern)
3. [Module Migration Status](#3-module-migration-status)
4. [Completed Modules (Detailed File Mapping)](#4-completed-modules-detailed-file-mapping)
   - [01. Dormitory (Hostel)](#01-modulesdormitory-)
   - [02. Transport](#02-modulestransport-)
   - [03. Library](#03-moduleslibrary-)
   - [04. Asset Management & AMC](#04-modulesasset-management-)
   - [05. Organization & Campus Setup](#05-modulesorganization-)
   - [06. HRMS (Staff, Faculty & Leaves)](#06-moduleshrms-)
   - [07. Timetable & Attendance](#07-modulestimetable-)
5. [Upcoming Modules (Target File Mapping)](#5-upcoming-modules-target-file-mapping)
   - [08. IAM & Security (Auth, Users, Roles)](#08-modulesiam-upcoming)
   - [09. Finance & Fee Management](#09-modulesfinance-upcoming)
   - [10. Student Lifecycle](#10-modulesstudent-upcoming)
   - [11. Academics & Curriculum](#11-modulesacademics-upcoming)
   - [12. Examination & Evaluation](#12-modulesexamination-upcoming)
   - [13. Shared & Infrastructure](#13-modulesshared-upcoming)
6. [Migration Rules & Path Conventions](#6-migration-rules--path-conventions)

---

## 1. Architecture Overview

### Pehle (Horizontal Layered Monolith):
Saare 113 routes, 116 controllers, 123 services, aur 145 repositories root folders me flat pade the:
```text
university-be/
├── controllers/    (116 files mixed together)
├── services/       (123 files mixed together)
├── repository/     (145 files mixed together)
├── router/         (100+ files mixed together)
└── app.js          (100+ manual route imports & mounts)
```

### Ab (Feature-Driven Modular Monolith):
Har domain ka apna independent self-contained module hai:
```text
university-be/
├── modules/
│   ├── dormitory/          <-- Hostel, Rooms, Beds
│   ├── transport/          <-- Buses, Routes, Drivers
│   ├── library/            <-- Books, Racks, Circulation
│   ├── asset-management/   <-- Assets, Inventory, AMC
│   ├── organization/       <-- Campus, Buildings, Rooms, Depts
│   └── ... (upcoming)
├── models/                 <-- Central database models
├── database/               <-- DB configs & migrations
├── utility/                <-- Global utilities
├── middleware/             <-- Global auth & access guards
└── app.js                  <-- Slim app.js importing modules only
```

---

## 2. Standard Module Pattern

Har module ke andar yeh 4 subfolders aur 1 aggregator file hoti hai:

```text
modules/<module-name>/
├── routes/        <-- Express router definitions
├── controllers/   <-- Request validation & HTTP responses
├── services/      <-- Business logic
├── repository/    <-- Sequelize database queries
└── index.js       <-- Module Router Aggregator
```

### Module Aggregator (`index.js`) Pattern:
Module ka `index.js` apne sabhi sub-routes ko mount karke export karta hai:
```javascript
import { Router } from "express";
import subRoute1 from "./routes/subRoute1.js";
import subRoute2 from "./routes/subRoute2.js";

const moduleRouter = Router();

moduleRouter.use("/subPath1", subRoute1);
moduleRouter.use("/subPath2", subRoute2);

export default moduleRouter;
```

### `app.js` Integration:
`app.js` me sirf 1 line se poora module mount ho jata hai:
```javascript
import customModule from "./modules/<module-name>/index.js";
// ...
app.use(customModule);
```

---

## 3. Module Migration Status

> 📌 **Summary Stats:** **Total Modules: 13** | **Completed: 7 (54%)** | **Remaining: 6 (46%)**  
> 🟢 **Completed (7):** `dormitory`, `transport`, `library`, `asset-management`, `organization`, `hrms`, `timetable`  
> 🟡 **Remaining (6):** `iam` *(next in queue)*, `finance`, `student`, `academics`, `examination`, `shared`

| # | Module Name | Scope / Responsibility | Files Count | Status |
|---|---|---|---|---|
| **01** | `dormitory` | Hostel buildings, room types, beds | 12 files | ✅ **Completed** |
| **02** | `transport` | Buses, routes, vehicle assignments | 12 files | ✅ **Completed** |
| **03** | `library` | Books catalog, racks, issue/return | 15 files | ✅ **Completed** |
| **04** | `asset-management` | Assets, categories, issues, AMC vendors & tickets | 26 files | ✅ **Completed** |
| **05** | `organization` | Campus, institutes, buildings, rooms, departments | 40 files | ✅ **Completed** |
| **06** | `hrms` | Staff, faculty load, leave policies & approvals | 50 files | ✅ **Completed** |
| **07** | `timetable` | Timetable generation, periods, attendance | 24 files | ✅ **Completed** |
| **08** | `iam` | Authentication, users, roles, permissions | 30 files | ⏳ *Next in queue* |
| **09** | `finance` | Fees, billing schedule, invoices, payments | 36 files | ⏳ *Pending* |
| **10** | `student` | Admissions, profiles, academic groups | 24 files | ⏳ *Pending* |
| **11** | `academics` | Courses, subjects, syllabus, curriculum, electives | 80+ files | ⏳ *Pending* |
| **12** | `examination` | Exam sessions, papers, evaluation, results | 75+ files | ⏳ *Pending* |
| **13** | `shared` | CodeMaster, settings, S3 files, BullMQ jobs | 20+ files | ⏳ *Pending* |

---

## 4. Completed Modules (Detailed File Mapping)

### 01. `modules/dormitory/` ✅
- **Responsibility:** Hostel management, room categories, bed allocations.
- **Endpoints Mounted:** `/dormitoryRoomType`, `/dormitoryList`, `/addDormitory`

| Layer | Files |
|---|---|
| **Routes** | `routes/addDormitoryRoute.js`, `routes/dormitoryListRoute.js`, `routes/roomTypeRoute.js` |
| **Controllers** | `controllers/addDormitoryController.js`, `controllers/dormitoryListController.js`, `controllers/roomTypeController.js` |
| **Services** | `services/addDormitoryServices.js`, `services/dormitoryListServices.js`, `services/roomTypeServices.js` |
| **Repository** | `repository/addDormitoryRepository.js`, `repository/dormitoryListRepository.js`, `repository/roomTypeRepository.js` |
| **Aggregator** | `index.js` |
| **DB Models** | `models/roomTypeModel.js`, `models/dormitoryListModel.js`, `models/addDormitoryModel.js` |

---

### 02. `modules/transport/` ✅
- **Responsibility:** College bus routes, vehicle fleets, driver assignments.
- **Endpoints Mounted:** `/transportRoute`, `/vehicle`, `/assignVehicle`

| Layer | Files |
|---|---|
| **Routes** | `routes/transportRoute.js`, `routes/vehicleRoute.js`, `routes/assignVehicleRoute.js` |
| **Controllers** | `controllers/transportRouteController.js`, `controllers/vehicleController.js`, `controllers/assignVehicleController.js` |
| **Services** | `services/transportRouteService.js`, `services/vehicleServices.js`, `services/assignVehicleServices.js` |
| **Repository** | `repository/transportRouteRepository.js`, `repository/vehicleRepository.js`, `repository/assignVehicleRepository.js` |
| **Aggregator** | `index.js` |
| **DB Models** | `models/transportRouteModel.js`, `models/vehicleModel.js`, `models/assignVehicleModel.js` |

---

### 03. `modules/library/` ✅
- **Responsibility:** Physical rack structures, book catalogs, Excel bulk imports, circulation (Issue/Return).
- **Endpoints Mounted:** `/libraryCreation`, `/libraryStructure`, `/libraryIssueBook`

| Layer | Files |
|---|---|
| **Routes** | `routes/libraryCreationRoute.js`, `routes/libraryStructureRoute.js`, `routes/libraryIssueBookTransactionRoute.js` |
| **Controllers** | `controllers/libraryCreationController.js`, `controllers/libraryStructureController.js`, `controllers/libraryIssueBookTransactionController.js` |
| **Services** | `services/libraryCreationServices.js`, `services/libraryStructureService.js`, `services/libraryIssueBookTransactionServices.js`, `services/libraryBookBulkUploadServices.js` |
| **Repository** | `repository/libraryCreationRepository.js`, `repository/libraryStructureRepository.js`, `repository/libraryIssueBookTransactionRepository.js`, `repository/libraryBookBulkUploadRepository.js` |
| **Aggregator** | `index.js` |
| **DB Models** | `models/libraryCreationModel.js`, `models/libraryFloorModel.js`, `models/libraryAisleModel.js`, `models/libraryRackModel.js`, `models/libraryRowModel.js`, `models/libraryBookModel.js`, `models/libraryBookInventoryModel.js`, `models/libraryCategoryModel.js`, `models/libraryBookCategoryMappingModel.js`, `models/libraryBookSubjectMappingModel.js`, `models/libraryIssueBookTransactionModel.js`, `models/libraryBookIssueInventoryItemModel.js`, `models/libraryReturnBookTransactionModel.js`, `models/libraryAuthorityModel.js` |

---

### 04. `modules/asset-management/` ✅
- **Responsibility:** College assets, categorization, inventory issue & return, vendor AMC contracts, maintenance tickets.
- **Endpoints Mounted:** `/assetCategory`, `/asset`, `/assetIssue`, `/amcVendor`, `/amcContract`, `/serviceTicket`

| Layer | Files |
|---|---|
| **Routes** | `routes/assetCategoryRoute.js`, `routes/assetRoute.js`, `routes/assetIssueRoute.js`, `routes/amcVendorRoute.js`, `routes/amcContractRoute.js`, `routes/amcServiceTicketRoute.js` |
| **Controllers** | `controllers/assetCategoryController.js`, `controllers/assetController.js`, `controllers/assetIssueController.js`, `controllers/amcVendorController.js`, `controllers/amcContractController.js`, `controllers/amcServiceTicketController.js` |
| **Services** | `services/assetCategoryServices.js`, `services/assetServices.js`, `services/assetIssueServices.js`, `services/assetReturnServices.js`, `services/amcVendorServices.js`, `services/amcContractServices.js`, `services/amcServiceTicketServices.js` |
| **Repository** | `repository/assetCategoryRepository.js`, `repository/assetRepository.js`, `repository/assetIssueRepository.js`, `repository/assetReturnRepository.js`, `repository/amcVendorRepository.js`, `repository/amcContractRepository.js`, `repository/amcServiceTicketRepository.js` |
| **Aggregator** | `index.js` |
| **DB Models** | `models/assetCategoryModel.js`, `models/assetModel.js`, `models/assetInventoryModel.js`, `models/assetIssueTransactionModel.js`, `models/assetIssueInventoryItemModel.js`, `models/assetReturnTransactionModel.js`, `models/amcVendorModel.js`, `models/amcContractModel.js`, `models/amcServiceTicketModel.js` |

---

### 05. `modules/organization/` ✅
- **Responsibility:** Campus hierarchy, institutes, buildings, floors, classrooms, departments, staff, positions, governance bodies.
- **Endpoints Mounted:** `/campus`, `/institute`, `/head`, `/building`, `/governanceBody`, `/floor`, `/department`, `/staff`, `/departmentPosition`, `/classRoom`

| Layer | Files |
|---|---|
| **Routes** | `routes/campusRoute.js`, `routes/instituteRoute.js`, `routes/buildingRoute.js`, `routes/floorRoute.js`, `routes/classRoomRoute.js`, `routes/departmentRoute.js`, `routes/departmentPositionsRoute.js`, `routes/governanceBodyRoute.js`, `routes/headRoute.js`, `routes/staffRoute.js` |
| **Controllers** | `controllers/campusController.js`, `controllers/instituteController.js`, `controllers/buildingController.js`, `controllers/floorController.js`, `controllers/classRoomController.js`, `controllers/departmentController.js`, `controllers/departmentPositionsController.js`, `controllers/governanceBodyController.js`, `controllers/headController.js`, `controllers/staffController.js` |
| **Services** | `services/campusService.js`, `services/instituteService.js`, `services/buildingServices.js`, `services/floorServices.js`, `services/classRoomServices.js`, `services/departmentService.js`, `services/departmentPositionsService.js`, `services/governanceBodyService.js`, `services/headServices.js`, `services/staffServices.js` |
| **Repository** | `repository/campusRepository.js`, `repository/instituteRepository.js`, `repository/buildingRepository.js`, `repository/floorRepository.js`, `repository/classRoomRepository.js`, `repository/departmentRepository.js`, `repository/departmentPositionsRepository.js`, `repository/governanceBodyRepository.js`, `repository/headRepository.js`, `repository/staffRepository.js` |
| **Aggregator** | `index.js` |
| **DB Models** | `models/campusModel.js`, `models/instituteModel.js`, `models/buildingModel.js`, `models/floorModel.js`, `models/classRoomModel.js`, `models/departmentModel.js`, `models/departmentPositionsModel.js`, `models/governanceBodyModel.js`, `models/headModel.js`, `models/staffModel.js` |

---

### 06. `modules/hrms/` ✅
- **Responsibility:** Employee profiles & metadata, teacher-subject mapping, substitute teachers, faculty workload, leave policies, requests & approval workflows.
- **Endpoints Mounted:** `/employee`, `/teacher`, `/teacherSubstitute`, `/faculityLoad`, `/leave-policies`, `/leave-requests`, `/approval-requests`, `/leave-balance`

| Layer | Files |
|---|---|
| **Routes** | `routes/employeeRoute.js`, `routes/teacherMappingRoute.js`, `routes/teacherSubstituteRoute.js`, `routes/faculityLoadRoute.js`, `routes/leavePolicyRouter.js`, `routes/leaveRequestRouter.js`, `routes/approvalRequestRouter.js`, `routes/leaveBalanceRouter.js` |
| **Controllers** | `controllers/employeeController.js`, `controllers/teacherMappingController.js`, `controllers/teacherSubstituteController.js`, `controllers/faculityLoadController.js`, `controllers/leavePolicyController.js`, `controllers/leaveRequestController.js`, `controllers/approvalRequestController.js`, `controllers/leaveBalanceController.js` |
| **Services** | `services/employeeServices.js`, `services/teacherMappingServices.js`, `services/teacherSubstituteServices.js`, `services/faculityService.js`, `services/leavePolicyService.js`, `services/leaveRequestService.js`, `services/approvalRequestService.js`, `services/leaveBalanceService.js` |
| **Repository** | `repository/employeeRepository.js`, `repository/employee*Repository.js` (16 sub-repos: Address, Office, Role, Skill, Document, Qualification, Experience, Achievement, Ward, Activity, Reference, Research, LongLeave, MetaData, Files, Schedule), `repository/teacherSubjectMappingRepository.js`, `repository/teacherSectionMappingRepository.js`, `repository/teacherSubstituteRepository.js`, `repository/faculityLoadRepository.js`, `repository/leavePolicyRepository.js`, `repository/leaveRequestRepository.js`, `repository/approvalRequestRepository.js`, `repository/leaveBalanceRepository.js` |
| **Aggregator** | `index.js` |

---

### 07. `modules/timetable/` ✅
- **Responsibility:** Timetable structure definitions, week cell routines, publish routines, academic group routines, student attendance tracking, holidays, and college schedules.
- **Endpoints Mounted:** `/timeTable`, `/timeTableCreate`, `/timetableAcademicGroup`, `/attendance`, `/holiday`, `/schedule`

| Layer | Files |
|---|---|
| **Routes** | `routes/timeTableRoute.js`, `routes/timeTableCreateRoute.js`, `routes/timetableAcademicGroupRoute.js`, `routes/attendanceRoute.js`, `routes/holidayRoute.js`, `routes/scheduleRoute.js` |
| **Controllers** | `controllers/timeTableController.js`, `controllers/timeTableCreateController.js`, `controllers/timetableAcademicGroupController.js`, `controllers/attendanceController.js`, `controllers/holidayController.js`, `controllers/scheduleController.js` |
| **Services** | `services/timeTableServices.js`, `services/timeTableCreateServices.js`, `services/attendanceServices.js`, `services/holidayServices.js`, `services/scheduleServices.js` |
| **Repository** | `repository/timeTableRepository.js`, `repository/timeTablecreateRepository.js`, `repository/attendanceRepository.js`, `repository/holidayRepository.js`, `repository/scheduleRepository.js` |
| **Aggregator** | `index.js` |

---

## 5. Upcoming Modules (Target File Mapping)

### 08. `modules/iam/` (Next in queue)
- **Responsibility:** Authentication, login/logout, JWT sessions, users, roles, permissions, authorization checks.
- **Endpoints:** `/user`, `/role`, `/permission`, `/rolePermissions`, `/userRolePermission`, `/authorization`, `/subAccount`
- **Routes:** `auth/userRoute.js`, `roleRoute.js`, `permissionRoute.js`, `rolePermissionsRoute.js`, `userRolePermissionRoute.js`, `userPermissionRoute.js`, `subAccountRoute.js`

---

### 09. `modules/finance/` (Upcoming)
- **Responsibility:** Fee structures, catalog, fee policies, billing schedules, payment terms, student invoices, fee receipts.
- **Endpoints:** `/feeTypeCategory`, `/feeTypeCatalog`, `/feePlanItem`, `/feePolicy`, `/billingSchedule`, `/billingSchedulePaymentTerms`, `/studentFeeInvoice`, `/studentFeePayment`, `/studentBillingBreakdown`

---

### 10. `modules/student/` (Upcoming)
- **Responsibility:** Student admission, records, sections, academic groups, previous academic history.
- **Endpoints:** `/student`, `/academicGroup`, `/classSections`, `/previousAcademic`, `/studentHallTicket`, `/resultStudent`

---

### 11. `modules/academics/` (Upcoming)
- **Responsibility:** Academic years, sessions, courses, subjects, subject components, weightage, curriculums, elective pools, regulations, credits, syllabi, lesson plans, PO & CO.
- **Endpoints:** `/acedmicYear`, `/session`, `/terms`, `/course`, `/specialization`, `/subject`, `/subjectComponent`, `/subjectWeightage`, `/api/curriculums`, `/curriculumCategory`, `/electivePool`, `/curriculumElectiveRequirement`, `/curriculumElectiveAssignment`, `/electiveSubject`, `/academicRegulation`, `/credit`, `/syllabus`, `/lesson`, `/lecture`, `/po`, `/co`

---

### 12. `modules/examination/` (Upcoming)
- **Responsibility:** Exam sessions, exam scheduling, slot mappings, question papers, question banks, invigilation, attendance, QR sheets, grading schemas, evaluations & results.
- **Endpoints:** `/examinationSession`, `/examinationSessionSlot`, `/examSchedule`, `/examStructure`, `/examScheduleMapping`, `/examSetupType`, `/assessmentPlan`, `/internalAssessment`, `/questionBank`, `/questionPaper`, `/questionPaperBlueprint`, `/gradingSchemas`, `/evalution`, `/examAttendance`, `/examRoomMaterialBundle`, `/examInvigilatorAssignment`, `/teacherExamAssignment`, `/answerSheetQr`, `/examResult`, `/examOperations`

---

### 13. `modules/shared/` (Upcoming)
- **Responsibility:** Common utilities, global settings, options, code master, S3 file upload, downloads, BullMQ jobs, logs.
- **Endpoints:** `/codeMaster`, `/setting`, `/options`, `/notice`, `/dashboard`, `/download`, `/fileUpload`, `/api/logs`, `/jobs`, `/jobSetting`, `/main`

---

## 6. Migration Rules & Path Conventions

Jab bhi koi nayi file kisi module ke andar shift hoti hai, to relative imports ko is table ke anusaar update karein:

| Purana Import (Root Folder se) | Naya Import (`modules/<module>/` ke andar se) |
|---|---|
| `from "../models/index.js"` | `from "../../../models/index.js"` |
| `from "../database/sequelizeConfig.js"` | `from "../../../database/sequelizeConfig.js"` |
| `from "../utility/scoped.js"` | `from "../../../utility/scoped.js"` |
| `from "../utility/<helper>.js"` | `from "../../../utility/<helper>.js"` |
| `from "../middleware/authUser.js"` | `from "../../../middleware/authUser.js"` |
| `from "../middleware/checkAccess.js"` | `from "../../../middleware/checkAccess.js"` |
| `from "../const/permissions.js"` | `from "../../../const/permissions.js"` |
| `from "../constant.js"` | `from "../../../constant.js"` |
| **Sibling Controller:** `from "../services/..."` | `from "../services/..."` *(No change, same level)* |
| **Sibling Service:** `from "../repository/..."` | `from "../repository/..."` *(No change, same level)* |

---

*Last Updated: 2026-11-10*

