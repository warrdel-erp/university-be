# Explicit `scoped()` migration progress

Track repository → service → controller migration for multi-tenant scoping.

## Context

1. This project replaces automatic Sequelize model patching with **explicit tenant scoping** via `utility/scoped.js`.
2. Every repository must use `scoped(model).*` for reads/writes, or gate child tables with `assertScoped*()` before mutate.
3. Tenant values (`universityId`, `instituteId`, `acedmicYearId`) come from `requestContext` / `buildScope()`—never from request body or manual controller passing.
4. Services hold business logic only; controllers pass business filters (e.g. `sessionId`, `examSetupTypeTermId`), not tenant IDs.
5. WHERE merges always put tenant scope last: `{ ...options.where, ...baseWhere }` so tenant constraints cannot be overridden.
6. Includes use `.unscoped()` on joined models with `buildScope()` on join `where` where the joined table has tenant columns.
7. `scoped().create()` / `bulkCreate()` inject only tenant fields that exist on the target model (`rawAttributes` filter).
8. Work proceeds in batches (~3 repos per batch): repository first, then service, then controller—documented in this file.
9. Repositories: use `scoped(model).*` directly; inline attributes/includes at call sites—no module-level constants or helper functions.
10. **113 of 113** repositories are full-stack complete (batches 1–8, 11–28).
11. Migration complete — all repositories use explicit `scoped()` scoping.

**Legend:** ✅ complete (full stack) · 🔶 repo scoped, stack audit pending · ⬜ not started

| Metric | Count |
|--------|-------|
| Total repositories | 113 |
| Scoped in repo | 113 |
| Full stack done | 113 (batches 1–8, 11–28) |
| Repo scoped, audit pending | 0 |
| Not started | 0 |

---

## Completed batches (full stack)

| Batch | Repositories | Scope notes |
|-------|-------------|-------------|
| **1** ✅ | `departmentRepository`, `buildingRepository`, `assetReturnRepository` | Institute + campus / issue joins |
| **2** ✅ | `floorRepository`, `roomTypeRepository`, `departmentStructureRepository` | Building→campus join |
| **3** ✅ | `campusRepository`, `instituteRepository`, `headRepository` | Campus university-scoped via `scoped()`; institute/head setup routes bypass institute/academic-year only |
| **4** ✅ | `acedmicYearRepository`, `subAccountRepository`, `coRepository` | AY bypass route + institute; subAccount university; CO full tenant |
| **5** ✅ | `courseRepository`, `creditRepository`, `subjectRepository` | Course institute+university; credit institute; subject + academic year |
| **6** ✅ | `subjectWeightageRepository`, `syllabusRepository`, `termsRepository` | Weightage via scoped joins; syllabus institute+year; terms full scoped reads |
| **7** ✅ | `studentRepository`, `studentClassSectionsHistoryRepository`, `attendanceRepository` | Student full tenant; history gated by student; attendance institute+university |
| **8** ✅ | `employeeRepository`, `employeeOfficeRepository`, `employeeAddressRepository`, `employeeMetaDataRepository`, `employeeRoleRepository` | Employee institute+year; child tables gated by scoped employee |
| **11** ✅ | `examTypeRepository`, `examSetupRepository`, `examSetupTypeRepository`, `examSetupTypeTermRepository` | Tenant via `scoped()` / `requestContext`; services/controllers no longer pass `universityId`/`instituteId` |
| **12** ✅ | `examStructureRepository`, `examStructureScheduleMappingRepository`, `examScheduleRepository`, `examScheduleRoomCapacityRepository` | Structure/schedule reads scoped; room capacity gated by schedule |
| **13** ✅ | `examAttendanceRepository`, `internalAssessmentRepository`, `evalutionRepository`, `gradeRepository` | Attendance/evaluation tenant via `scoped()`; assessment gated; grade create without manual tenant |
| **14** ✅ | `questionBankRepository`, `questionPaperRepository`, `questionPaperBlueprintRepository`, `teacherExamAssignmentRepository` | Question bank/blueprint `universityId` via `scoped()`; papers gated by schedule |
| **15** ✅ | `studentHallTicketRepository` | Hall ticket `instituteId`/`universityId` via `scoped().bulkCreate()`; list/get without manual tenant filters |
| **16** ✅ | Batch 9 employee child (11), batch 10 (3), earlier 🔶 cluster (11) — see below | Stack audit: tenant params removed from lesson/options/timetable-create/answerSheet/schedule controllers; employee child ops gated via `assertScopedEmployee()` in `employeeServices` |
| **17** ✅ | `assetCategoryRepository`, `assetIssueRepository`, `assetRepository` | Institute via `scoped()`; tenant params removed from asset stack; security payments use scoped `studentFeePayment` |
| **18** ✅ | `feeGroupRepository`, `feeTypeRepository`, `feeTypeCategoryRepository` | Fee group institute+AY via `scoped()`; fee type gated via user university + fee group scope; category institute via `scoped()` |
| **19** ✅ | `feeTypeCatalogRepository`, `feePlanProfileRepository`, `feePlanRepository` | Catalog/profile/plan scoped; legacy fee plan update/delete fixed; nested includes use `buildScope()` |
| **20** ✅ | `feeInvoiceRepository`, `feeInvoiceDetailsRepository`, `feeInvoiceDetailRecordRepository` | Legacy invoice tables gated via user/feePlan/student/mapper joins; child CRUD asserts scoped parent; institute code from context |
| **21** ✅ | `studentFeeInvoiceRepository`, `studentFeePaymentRepository`, `studentInvoiceRepository` | Student fee invoice/payment via `scoped()`; legacy student invoice mapper gated via student + university scope |
| **22** ✅ | `libraryCreationRepository`, `libraryStructureRepository`, `libraryIssueBookTransactionRepository` | Floor/category scoped direct; library via user join; aisle/rack/row/book/issue gated via floor/library parent joins |
| **23** ✅ | `libraryBookBulkUploadRepository`, `leaveBalanceRepository`, `leavePolicyRepository` | Bulk upload gated via scoped library/book/inventory; leave balance via employee+policy joins; policies via `scoped()` |
| **24** ✅ | `leaveRequestRepository`, `jobSettingsRepository`, `jobRepository` | Leave requests gated via scoped employee+policy joins; job types/jobs via `scoped()`; master filter uses scoped job settings |
| **25** ✅ | `settingRepository`, `noticeRepository`, `pdfSplitJobRepository` | Global settings via `scoped()` (no tenant columns); notices full tenant CRUD; PDF split jobs scoped on HTTP, workers gate by id after assert |
| **26** ✅ | `faculityLoadRepository`, `transportRouteRepository`, `vehicleRepository` | Faculty load gated via scoped employee joins; transport routes full tenant; vehicles scoped + employee join |
| **27** ✅ | `assignVehicleRepository`, `addDormitoryRepository`, `dormitoryListRepository` | Assign vehicle gated via route/vehicle/user joins; dormitory list full tenant; rooms gated via list/roomType joins |
| **28** ✅ | `mainRepository`, `roleRepository`, `permissionRepository`, `rolePermissionMappingRepository`, `userRoleRepository`, `userPermissionRepository`, `userRepository`, `userRolePermissionRepository`, `poRepository`, `collegeRepository`, `codeMasterRepository`, `s3FileRepository` | Auth paths unscoped; RBAC global or user-gated; main setup scoped; utility codes via scoped lookups; S3 files filter by context institute |

### Batch 16 detail (stack audit)

| Cluster | Repositories |
|---------|-------------|
| Employee child (11) | `employeeQualification`, `employeeDocument`, `employeeSkill`, `employeeExperiance`, `employeeAchivement`, `employeeReference`, `employeeActivity`, `employeeLongLeave`, `employeeResearch`, `employeeWard`, `employeeFiles` |
| Lesson / options / timetable create (3) | `lessonRepository`, `optionsRepository`, `timeTablecreateRepository` |
| Earlier repo-only (11) | `answerSheetQrRepository`, `classRoomRepository`, `electiveSubjectRepository`, `holidayRepository`, `scheduleRepository`, `sectionRepository`, `sessionRepository`, `staffRepository`, `teacherSectionMappingRepository`, `teacherSubjectMappingRepository`, `timeTableRepository` |

---

## Planned batches (remaining)

| Batch | Scope | Repositories |
|-------|-------|-------------|
| **9–19** | ✅ | Employee child, lesson/options/timetable, exam, hall tickets, earlier 🔶 cluster, asset, fee group/type/category/catalog/plan — done |
| **20** | ✅ | Legacy fee invoice + details + detail record |
| **21** | ✅ | Student fee invoice/payment + legacy student invoice |
| **22** | ✅ | Library creation, structure, issue transactions |
| **23** | ✅ | Library bulk upload + leave balance/policy |
| **24** | ✅ | Leave requests + jobs cluster |
| **25** | ✅ | Settings, notices, PDF split jobs |
| **26** | ✅ | Faculty load + transport routes/vehicles |
| **27** | ✅ | Assign vehicle + dormitory |
| **28** | ✅ | Auth / RBAC / users / main / utility |

---

## All repositories — status

| Repository | Status |
|------------|--------|
| acedmicYearRepository | ✅ Batch 4 |
| addDormitoryRepository | ✅ Batch 27 |
| answerSheetQrRepository | ✅ Batch 16 |
| assetCategoryRepository | ✅ Batch 17 |
| assetIssueRepository | ✅ Batch 17 |
| assetRepository | ✅ Batch 17 |
| assetReturnRepository | ✅ Batch 1 |
| assignVehicleRepository | ✅ Batch 27 |
| attendanceRepository | ✅ Batch 7 |
| buildingRepository | ✅ Batch 1 |
| campusRepository | ✅ Batch 3 |
| classRoomRepository | ✅ Batch 16 |
| codeMasterRepository | ✅ Batch 28 |
| collegeRepository | ✅ Batch 28 (utility codes) |
| coRepository | ✅ Batch 4 |
| courseRepository | ✅ Batch 5 |
| creditRepository | ✅ Batch 5 |
| departmentRepository | ✅ Batch 1 |
| departmentStructureRepository | ✅ Batch 2 |
| dormitoryListRepository | ✅ Batch 27 |
| electiveSubjectRepository | ✅ Batch 16 |
| employeeAchivementRepository | ✅ Batch 16 |
| employeeActivityRepository | ✅ Batch 16 |
| employeeAddressRepository | ✅ Batch 8 |
| employeeDocumentRepository | ✅ Batch 16 |
| employeeExperianceRepository | ✅ Batch 16 |
| employeeFilesRepository | ✅ Batch 16 |
| employeeLongLeaveRepository | ✅ Batch 16 |
| employeeMetaDataRepository | ✅ Batch 8 |
| employeeOfficeRepository | ✅ Batch 8 |
| employeeQualificationRepository | ✅ Batch 16 |
| employeeReferenceRepository | ✅ Batch 16 |
| employeeRepository | ✅ Batch 8 |
| employeeResearchRepository | ✅ Batch 16 |
| employeeRoleRepository | ✅ Batch 8 |
| employeeSkillRepository | ✅ Batch 16 |
| employeeWardRepository | ✅ Batch 16 |
| evalutionRepository | ✅ Batch 13 |
| examAttendanceRepository | ✅ Batch 13 |
| examScheduleRepository | ✅ Batch 12 |
| examScheduleRoomCapacityRepository | ✅ Batch 12 |
| examSetupRepository | ✅ Batch 11 |
| examSetupTypeRepository | ✅ Batch 11 |
| examSetupTypeTermRepository | ✅ Batch 11 |
| examStructureRepository | ✅ Batch 12 |
| examStructureScheduleMappingRepository | ✅ Batch 12 |
| examTypeRepository | ✅ Batch 11 |
| faculityLoadRepository | ✅ Batch 26 |
| feeGroupRepository | ✅ Batch 18 |
| feeInvoiceDetailRecordRepository | ✅ Batch 20 |
| feeInvoiceDetailsRepository | ✅ Batch 20 |
| feeInvoiceRepository | ✅ Batch 20 |
| feePlanProfileRepository | ✅ Batch 19 |
| feePlanRepository | ✅ Batch 19 |
| feeTypeCatalogRepository | ✅ Batch 19 |
| feeTypeCategoryRepository | ✅ Batch 18 |
| feeTypeRepository | ✅ Batch 18 |
| floorRepository | ✅ Batch 2 |
| gradeRepository | ✅ Batch 13 |
| headRepository | ✅ Batch 3 |
| holidayRepository | ✅ Batch 16 |
| instituteRepository | ✅ Batch 3 |
| internalAssessmentRepository | ✅ Batch 13 |
| jobRepository | ✅ Batch 24 |
| jobSettingsRepository | ✅ Batch 24 |
| leaveBalanceRepository | ✅ Batch 23 |
| leavePolicyRepository | ✅ Batch 23 |
| leaveRequestRepository | ✅ Batch 24 |
| lessonRepository | ✅ Batch 16 |
| libraryBookBulkUploadRepository | ✅ Batch 23 |
| libraryCreationRepository | ✅ Batch 22 |
| libraryIssueBookTransactionRepository | ✅ Batch 22 |
| libraryStructureRepository | ✅ Batch 22 |
| mainRepository | ✅ Batch 28 |
| noticeRepository | ✅ Batch 25 |
| optionsRepository | ✅ Batch 16 |
| pdfSplitJobRepository | ✅ Batch 25 |
| permissionRepository | ✅ Batch 28 |
| poRepository | ✅ Batch 28 |
| questionBankRepository | ✅ Batch 14 |
| questionPaperBlueprintRepository | ✅ Batch 14 |
| questionPaperRepository | ✅ Batch 14 |
| rolePermissionMappingRepository | ✅ Batch 28 |
| roleRepository | ✅ Batch 28 |
| roomTypeRepository | ✅ Batch 2 |
| s3FileRepository | ✅ Batch 28 |
| scheduleRepository | ✅ Batch 16 |
| sectionRepository | ✅ Batch 16 |
| sessionRepository | ✅ Batch 16 |
| settingRepository | ✅ Batch 25 |
| staffRepository | ✅ Batch 16 |
| studentClassSectionsHistoryRepository | ✅ Batch 7 |
| studentFeeInvoiceRepository | ✅ Batch 21 |
| studentFeePaymentRepository | ✅ Batch 21 |
| studentHallTicketRepository | ✅ Batch 15 |
| studentInvoiceRepository | ✅ Batch 21 |
| studentRepository | ✅ Batch 7 |
| subAccountRepository | ✅ Batch 4 |
| subjectRepository | ✅ Batch 5 |
| subjectWeightageRepository | ✅ Batch 6 |
| syllabusRepository | ✅ Batch 6 |
| teacherExamAssignmentRepository | ✅ Batch 14 |
| teacherSectionMappingRepository | ✅ Batch 16 |
| teacherSubjectMappingRepository | ✅ Batch 16 |
| termsRepository | ✅ Batch 6 |
| timeTablecreateRepository | ✅ Batch 16 |
| timeTableRepository | ✅ Batch 16 |
| transportRouteRepository | ✅ Batch 26 |
| userPermissionRepository | ✅ Batch 28 |
| userRepository | ✅ Batch 28 |
| userRolePermissionRepository | ✅ Batch 28 |
| userRoleRepository | ✅ Batch 28 |
| vehicleRepository | ✅ Batch 26 |

---

*Last updated: Batch 28 full stack (auth/RBAC, users, main, utility repos) — **113/113 complete***
