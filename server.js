import "dotenv/config";
import express, { json, urlencoded } from "express";
import cors from "cors";
const app = express();
const PORT = process.env.PORT || 8080;
import fileUpload from "express-fileupload";

import main from "./router/mainRoute.js";
import setting from "./router/settingRoute.js";
import student from "./router/studentRoute.js";
import download from "./router/downloadRoute.js";
import codeMaster from "./router/codeMasterRoute.js";
import campus from "./router/campusRoute.js";
import institute from "./router/instituteRoute.js";
import specialization from "./router/specializationRoute.js";
import course from "./router/courseRoute.js";
import user from "./router/auth/userRoute.js";
import employee from "./router/employeeRoute.js";
import teacher from "./router/teacherMappingRoute.js";
import libraryCreation from "./router/libraryCreationRoute.js";
import timeTable from "./router/timeTableRoute.js";
import faculityLoad from "./router/faculityLoadRoute.js";
import timeTableCreate from "./router/timeTableCreateRoute.js";
import attendance from "./router/attendanceRoute.js";
import classRoom from "./router/classRoomRoute.js";
import feeGroup from "./router/feeGroupRoute.js";
import feeType from "./router/feeTypeRoute.js";
import feeTypeCategory from "./router/feeTypeCategoryRoute.js";
import feeTypeCatalog from "./router/feeTypeCatalogRoute.js";
import assetCategory from "./router/assetCategoryRoute.js";
import asset from "./router/assetRoute.js";
import assetIssue from "./router/assetIssueRoute.js";
import amcVendor from "./router/amcVendorRoute.js";
import amcContract from "./router/amcContractRoute.js";
import amcServiceTicket from "./router/amcServiceTicketRoute.js";
import feeInvoice from "./router/feeInvoiceRoute.js";
import feeInvoiceDetails from "./router/feeInvoiceDetailRoute.js";
import role from "./router/roleRoute.js";
import permission from "./router/permissionRoute.js";
import rolePermissionMapping from "./router/rolePermissionMappingRoute.js";
import userRolePermission from "./router/userRolePermissionRoute.js";
import dormitoryRoomType from "./router/roomTypeRoute.js";
import dormitoryList from "./router/dormitoryListRoute.js";
import addDormitory from "./router/addDormitoryRoute.js";
import examType from "./router/examTypeRoute.js";
import examSetup from "./router/examSetupRoute.js";
import examAttendance from "./router/examAttendanceRoute.js";
import transportRoute from "./router/transportRoute.js";
import vehicleRoute from "./router/vehicleRoute.js";
import assignVehicleRoute from "./router/assignVehicleRoute.js";
import acedmicYear from "./router/acedmicYearRoute.js";
import holiday from "./router/holidayRoute.js";
import electiveSubject from "./router/electiveSubjectRoute.js";
import building from "./router/buildingRoute.js";
import governanceBody from "./router/governanceBodyRoute.js";
import floor from "./router/floorRoute.js";
import head from "./router/headRoute.js";
import department from "./router/departmentRoute.js";
import staff from "./router/staffRoute.js";
import departmentPositions from "./router/departmentPositionsRoute.js";
import syllabus from "./router/syllabusRoute.js";
import session from "./router/sessionRoute.js";
import po from "./router/poRoute.js";
import co from "./router/coRoute.js";
import feePlan from "./router/feePlanRoute.js";
import feePlanProfile from "./router/feePlanProfileRoute.js";
import studentFeeInvoice from "./router/studentFeeInvoiceRoute.js";
import studentFeePayment from "./router/studentFeePaymentRoute.js";
import feeInvoiceRecord from "./router/feeInvoiceDetailRecordRoute.js";
import studentInvoice from "./router/studentInvoiceRoute.js";
import lesson from "./router/lessonRoute.js";
import lecture from "./router/lectureRoute.js";
import notice from "./router/noticeRoute.js";
import examStructure from "./router/examStructureRoute.js";
import schedule from "./router/scheduleRoute.js";
import leavePolicy from "./router/leavePolicyRouter.js";
import leaveRequest from "./router/leaveRequestRouter.js";
import leaveBalance from "./router/leaveBalanceRouter.js";
import examScheduleMapping from "./router/examStructureScheduleMappingRoute.js";
import libraryStructure from "./router/libraryStructureRoute.js";
import internalAssessment from "./router/internalAssessmentRoute.js";
import jobSetting from "./router/jobSettingsRoutes.js";
import jobs from "./router/jobRoutes.js";
import gradingSchemas from "./router/gradingSchemasRouter.js";
import academicRegulation from "./router/academicRegulationRoute.js";
import credit from "./router/creditRoute.js";
import evalution from "./router/evalutionRoute.js";
import terms from "./router/termsRoute.js";
import subjects from "./router/subjectRoute.js";
import userPermission from "./router/userPermissionRoute.js";
import resultStudent from "./router/resultStudentRoutes.js";
import questionPaper from "./router/questionPaperRoute.js";
import questionBank from "./router/questionBankRoute.js";
import classSection from "./router/classSectionRoute.js";
import dashboard from "./router/dashboardRoute.js";
import teacherExamAssignment from "./router/teacherExamAssignmentRoute.js";
import teacherSubstitute from "./router/teacherSubstituteRoute.js";
import questionPaperBlueprint from "./router/questionPaperBlueprintRoute.js";
import examSetupTypeTerm from "./router/examSetupTypeTermRoute.js";
import examSetupType from "./router/examSetupTypeRoute.js";
import examSchedule from "./router/examScheduleRoute.js";
import studentHallTicket from "./router/studentHallTicketRoute.js";
import options from "./router/optionsRoute.js";
import academicGroup from "./router/academicGroupRoute.js";
import timetableAcademicGroup from "./router/timetableAcademicGroupRoute.js";
import subjectWeightage from "./router/subjectWeightageRoute.js";
import libraryIssueBookTransaction from "./router/libraryIssueBookTransactionRoute.js";

import answerSheetQr from "./router/answerSheetQrRoute.js";
import s3FileRoute from "./router/s3FileRoute.js";
// middleware
app.use((req, res, next) => {
  if (req.originalUrl.startsWith("/answerSheetQr/splitPdf")) {
    return next();
  }
  fileUpload()(req, res, next);
});
app.use(json());
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      message: 'Invalid JSON in request body',
      hint: 'Empty Postman variables produce invalid JSON — run create steps in order or set collection variables.',
      error: err.message,
    });
  }
  next(err);
});
app.use(cors());
app.use(urlencoded({ extended: true }));

//routes

// Tenant setup — campus, institute, and academic year use explicit scoped() in repositories
app.use("/campus", campus);
app.use("/institute", institute);
app.use("/specialization", specialization);
app.use("/acedmicYear", acedmicYear); 
// Institute + University scoped (X-Institute-Id via authUser; no academic year on core models)

app.use("/course", course);
app.use("/questionPaper", questionPaper);
app.use("/questionBank", questionBank);
app.use("/examSetupType", examSetupType);

app.use("/gradingSchemas", gradingSchemas);
app.use("/academicRegulation", academicRegulation);

app.use("/credit", credit);
app.use("/evalution", evalution);
app.use("/feeTypeCategory", feeTypeCategory);
app.use("/feeTypeCatalog", feeTypeCatalog);
app.use("/feePlanProfile", feePlanProfile);
app.use("/authorization", userPermission);
app.use("/libraryCreation", libraryCreation);
app.use("/libraryStructure", libraryStructure);
app.use("/head", head);
app.use("/building", building);
app.use("/governanceBody", governanceBody);
app.use("/floor", floor);
app.use("/department", department);
app.use("/staff", staff);

app.use("/departmentPosition", departmentPositions);

app.use("/assetCategory", assetCategory);
app.use("/asset", asset);
app.use("/assetIssue", assetIssue);

app.use("/amcVendor", amcVendor);
app.use("/amcContract", amcContract);
app.use("/serviceTicket", amcServiceTicket);

// Institute + University + Academic Year scoped (X-Institute-Id + X-Academic-Year-Id via authUser)
app.use("/session", session);
app.use("/subject", subjects);
app.use("/terms", terms);
app.use("/syllabus", syllabus);
app.use("/resultStudent", resultStudent);
app.use("/classSections", classSection);
app.use("/dashboard", dashboard);
app.use("/teacherExamAssignment", teacherExamAssignment);
app.use("/teacherSubstitute", teacherSubstitute);
app.use("/questionPaperBlueprint", questionPaperBlueprint);
app.use("/examSetupTypeTerm", examSetupTypeTerm);
app.use("/examSchedule", examSchedule);

app.use("/examStructure", examStructure);

app.use("/examScheduleMapping", examScheduleMapping);
app.use("/internalAssessment", internalAssessment);
app.use("/examType", examType);
app.use("/examSetup", examSetup);
app.use("/examAttendance", examAttendance);
app.use("/studentHallTicket", studentHallTicket);
app.use("/options", options);
app.use("/academicGroup", academicGroup);
app.use("/subjectWeightage", subjectWeightage);
app.use("/electiveSubject", electiveSubject);
app.use("/student", student);
app.use("/employee", employee);
app.use("/teacher", teacher);

// ---------------------------------------------------------------------------
// Schedule date-wise stack (structure → week cells → date instances → consumers)
// ---------------------------------------------------------------------------
app.use("/timeTable", timeTable);                 // structure + courseMapping + periods
app.use("/timeTableCreate", timeTableCreate);     // week cells + teachers; publish → date-wise
app.use("/timetableAcademicGroup", timetableAcademicGroup);
app.use("/faculityLoad", faculityLoad);
app.use("/attendance", attendance);               // keys: timeTableCellDateWiseId
app.use("/lesson", lesson);                       // mapping keys: timeTableCellDateWiseId
app.use("/lecture", lecture);

app.use("/feePlan", feePlan);
app.use("/studentFeeInvoice", studentFeeInvoice);
app.use("/studentFeePayment", studentFeePayment);
app.use("/feeInvoiceRecord", feeInvoiceRecord);
app.use("/studentInvoice", studentInvoice);
app.use("/feeInvoice", feeInvoice);
app.use("/feeInvoiceDetails", feeInvoiceDetails);
app.use("/feeGroup", feeGroup);
app.use("/feeType", feeType);
app.use("/libraryIssueBook", libraryIssueBookTransaction);
app.use("/holiday", holiday);
app.use("/notice", notice);
app.use("/schedule", schedule);
app.use("/po", po);
app.use("/co", co);
app.use("/dormitoryRoomType", dormitoryRoomType);
app.use("/dormitoryList", dormitoryList);
app.use("/addDormitory", addDormitory);
app.use("/transportRoute", transportRoute);
app.use("/answerSheetQr", answerSheetQr);

app.use("/fileUpload", s3FileRoute);

app.use("/main", main);
app.use("/setting", setting);
app.use("/download", download);
app.use("/codeMaster", codeMaster);
app.use("/user", user);
app.use("/classRoom", classRoom);
app.use("/role", role);
app.use("/permission", permission);
app.use("/rolePermissionMapping", rolePermissionMapping);
app.use("/userRolePermission", userRolePermission);
app.use("/vehicle", vehicleRoute);
app.use("/assignVehicle", assignVehicleRoute);
app.use("/leave-policies", leavePolicy);
app.use("/leave-requests", leaveRequest);
app.use("/leave-balance", leaveBalance);
app.use("/jobSetting", jobSetting);
app.use("/jobs", jobs);

app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});

// Auto-spawn PDF Split Worker via worker_threads
import "./workers/pdfSplitWorkerLauncher.js";
