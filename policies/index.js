import { getScopeFilter as coursePolicy } from './course.policy.js';
import { getScopeFilter as academicYearPolicy } from './academicYear.policy.js';
import { getScopeFilter as codeMasterPolicy } from './codeMaster.policy.js';
import { getScopeFilter as sessionPolicy } from './session.policy.js';
import { getScopeFilter as departmentPolicy } from './department.policy.js';
import { getScopeFilter as organogramPolicy } from './organogram.policy.js';
import { getScopeFilter as headPolicy } from './head.policy.js';
import { getScopeFilter as governanceBodyPolicy } from './governanceBody.policy.js';
import { getScopeFilter as subjectPolicy } from './subject.policy.js';
import { getScopeFilter as creditPolicy } from './credit.policy.js';
import { getScopeFilter as syllabusPolicy } from './syllabus.policy.js';
import { getScopeFilter as electiveSubjectPolicy } from './electiveSubject.policy.js';
import { getScopeFilter as semesterSubjectMappingPolicy } from './semesterSubjectMapping.policy.js';
import { getScopeFilter as programOutcomePolicy } from './programOutcome.policy.js';
import { getScopeFilter as courseOutcomePolicy } from './courseOutcome.policy.js';
import { getScopeFilter as bloomsTaxonomyPolicy } from './bloomsTaxonomy.policy.js';
import { getScopeFilter as classSetupPolicy } from './classSetup.policy.js';
import { getScopeFilter as groupsScopePolicy } from './groupsScope.policy.js';
import { getScopeFilter as teacherMappedClassesPolicy } from './teacherMappedClasses.policy.js';
import { getScopeFilter as teacherMappedSubjectsPolicy } from './teacherMappedSubjects.policy.js';
import { getScopeFilter as classRecordsPolicy } from './classRecords.policy.js';
import { getScopeFilter as timeTableSetupPolicy } from './timeTableSetup.policy.js';
import { getScopeFilter as createTimeTablePolicy } from './createTimeTable.policy.js';
import { getScopeFilter as classRoutinePolicy } from './classRoutine.policy.js';
import { getScopeFilter as facultyLoadPolicy } from './facultyLoad.policy.js';
import { getScopeFilter as dateWiseTimeTableRoutinePolicy } from './dateWiseTimeTableRoutine.policy.js';
import { getScopeFilter as myClassesPolicy } from './myClasses.policy.js';
import { getScopeFilter as lessonPlanBuilderPolicy } from './lessonPlanBuilder.policy.js';
import { getScopeFilter as lessonPlanOverviewPolicy } from './lessonPlanOverview.policy.js';
import { getScopeFilter as lessonListPolicy } from './lessonList.policy.js';
import { getScopeFilter as topicOverviewPolicy } from './topicOverview.policy.js';
import { getScopeFilter as studyMaterialPolicy } from './studyMaterial.policy.js';
import { getScopeFilter as uploadStudyMaterialPolicy } from './uploadStudyMaterial.policy.js';
import { getScopeFilter as feesTypePolicy } from './feesType.policy.js';
import { getScopeFilter as feesPlanPolicy } from './feesPlan.policy.js';
import { getScopeFilter as feesInvoicePolicy } from './feesInvoice.policy.js';
import { getScopeFilter as studentFeePlansPolicy } from './studentFeePlans.policy.js';
import { getScopeFilter as studentFeePaymentsPolicy } from './studentFeePayments.policy.js';
import { getScopeFilter as hrMasterPolicy } from './hrMaster.policy.js';
import { getScopeFilter as staffDirectoryPolicy } from './staffDirectory.policy.js';
import { getScopeFilter as applyLeavePolicy } from './applyLeave.policy.js';
import { getScopeFilter as pendingLeaveRequestPolicy } from './pendingLeaveRequest.policy.js';
import { getScopeFilter as leavePolicyPolicy } from './leavePolicy.policy.js';
import { getScopeFilter as employeeAttendancePolicy } from './employeeAttendance.policy.js';
import { getScopeFilter as scheduleListPolicy } from './scheduleList.policy.js';
import { getScopeFilter as shiftListPolicy } from './shiftList.policy.js';
import { getScopeFilter as addStudentPolicy } from './addStudent.policy.js';
import { getScopeFilter as studentListPolicy } from './studentList.policy.js';
import { getScopeFilter as missingEnrollmentsPolicy } from './missingEnrollments.policy.js';
import { getScopeFilter as missingStudentFeePlanPolicy } from './missingStudentFeePlan.policy.js';
import { getScopeFilter as studentPromotePolicy } from './studentPromote.policy.js';
import { getScopeFilter as incidentListPolicy } from './incidentList.policy.js';
import { getScopeFilter as studentWiseIncidentListPolicy } from './studentWiseIncidentList.policy.js';
import { getScopeFilter as libraryCreationPolicy } from './libraryCreation.policy.js';
import { getScopeFilter as cataloguePolicy } from './catalogue.policy.js';
import { getScopeFilter as addMemberPolicy } from './addMember.policy.js';
import { getScopeFilter as bookIssuePolicy } from './bookIssue.policy.js';
import { getScopeFilter as returnBookPolicy } from './returnBook.policy.js';
import { getScopeFilter as dormitoryRoomTypePolicy } from './dormitoryRoomType.policy.js';
import { getScopeFilter as dormitoryRoomsPolicy } from './dormitoryRooms.policy.js';
import { getScopeFilter as dormitoryAssignmentPolicy } from './dormitoryAssignment.policy.js';
import { getScopeFilter as transportRoutePolicy } from './transportRoute.policy.js';
import { getScopeFilter as vehiclePolicy } from './vehicle.policy.js';
import { getScopeFilter as assignVehiclePolicy } from './assignVehicle.policy.js';
import { getScopeFilter as overviewPolicy } from './overview.policy.js';
import { getScopeFilter as manageActiveJobsPolicy } from './manageActiveJobs.policy.js';
import { getScopeFilter as calendarViewJobsPolicy } from './calendarViewJobs.policy.js';
import { getScopeFilter as buildingsPolicy } from './buildings.policy.js';
import { getScopeFilter as assetManagementPolicy } from './assetManagement.policy.js';
import { getScopeFilter as amcVendorsPolicy } from './amcVendors.policy.js';
import { getScopeFilter as amcContractsPolicy } from './amcContracts.policy.js';
import { getScopeFilter as serviceTicketsPolicy } from './serviceTickets.policy.js';
import { getScopeFilter as assetIssuePolicy } from './assetIssue.policy.js';
import { getScopeFilter as assetIssueReturnPolicy } from './assetIssueReturn.policy.js';
import { getScopeFilter as jobTypeSettingPolicy } from './jobTypeSetting.policy.js';
import { getScopeFilter as noticeBoardPolicy } from './noticeBoard.policy.js';
import { getScopeFilter as calendarPolicy } from './calendar.policy.js';
import { getScopeFilter as idCardPolicy } from './idCard.policy.js';
import { getScopeFilter as certificateListPolicy } from './certificateList.policy.js';

export const policies = {
    course: coursePolicy,
    academicYear: academicYearPolicy,
    codeMaster: codeMasterPolicy,
    session: sessionPolicy,
    department: departmentPolicy,
    organogram: organogramPolicy,
    head: headPolicy,
    governanceBody: governanceBodyPolicy,
    subject: subjectPolicy,
    credit: creditPolicy,
    syllabus: syllabusPolicy,
    electiveSubject: electiveSubjectPolicy,
    semesterSubjectMapping: semesterSubjectMappingPolicy,
    programOutcome: programOutcomePolicy,
    courseOutcome: courseOutcomePolicy,
    bloomsTaxonomy: bloomsTaxonomyPolicy,
    classSetup: classSetupPolicy,
    groupsScope: groupsScopePolicy,
    teacherMappedClasses: teacherMappedClassesPolicy,
    teacherMappedSubjects: teacherMappedSubjectsPolicy,
    classRecords: classRecordsPolicy,
    timeTableSetup: timeTableSetupPolicy,
    createTimeTable: createTimeTablePolicy,
    classRoutine: classRoutinePolicy,
    facultyLoad: facultyLoadPolicy,
    dateWiseTimeTableRoutine: dateWiseTimeTableRoutinePolicy,
    myClasses: myClassesPolicy,
    lessonPlanBuilder: lessonPlanBuilderPolicy,
    lessonPlanOverview: lessonPlanOverviewPolicy,
    lessonList: lessonListPolicy,
    topicOverview: topicOverviewPolicy,
    studyMaterial: studyMaterialPolicy,
    uploadStudyMaterial: uploadStudyMaterialPolicy,
    feesType: feesTypePolicy,
    feesPlan: feesPlanPolicy,
    feesInvoice: feesInvoicePolicy,
    studentFeePlans: studentFeePlansPolicy,
    studentFeePayments: studentFeePaymentsPolicy,
    hrMaster: hrMasterPolicy,
    staffDirectory: staffDirectoryPolicy,
    applyLeave: applyLeavePolicy,
    pendingLeaveRequest: pendingLeaveRequestPolicy,
    leavePolicy: leavePolicyPolicy,
    employeeAttendance: employeeAttendancePolicy,
    scheduleList: scheduleListPolicy,
    shiftList: shiftListPolicy,
    addStudent: addStudentPolicy,
    studentList: studentListPolicy,
    missingEnrollments: missingEnrollmentsPolicy,
    missingStudentFeePlan: missingStudentFeePlanPolicy,
    studentPromote: studentPromotePolicy,
    incidentList: incidentListPolicy,
    studentWiseIncidentList: studentWiseIncidentListPolicy,
    libraryCreation: libraryCreationPolicy,
    catalogue: cataloguePolicy,
    addMember: addMemberPolicy,
    bookIssue: bookIssuePolicy,
    returnBook: returnBookPolicy,
    dormitoryRoomType: dormitoryRoomTypePolicy,
    dormitoryRooms: dormitoryRoomsPolicy,
    dormitoryAssignment: dormitoryAssignmentPolicy,
    transportRoute: transportRoutePolicy,
    vehicle: vehiclePolicy,
    assignVehicle: assignVehiclePolicy,
    overview: overviewPolicy,
    manageActiveJobs: manageActiveJobsPolicy,
    calendarViewJobs: calendarViewJobsPolicy,
    buildings: buildingsPolicy,
    assetManagement: assetManagementPolicy,
    amcVendors: amcVendorsPolicy,
    amcContracts: amcContractsPolicy,
    serviceTickets: serviceTicketsPolicy,
    assetIssue: assetIssuePolicy,
    assetIssueReturn: assetIssueReturnPolicy,
    jobTypeSetting: jobTypeSettingPolicy,
    noticeBoard: noticeBoardPolicy,
    calendar: calendarPolicy,
    idCard: idCardPolicy,
    certificateList: certificateListPolicy
};
