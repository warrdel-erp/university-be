import * as dashboardRepository from '../repository/dashboardRepository.js';
import { formatQueryDate } from '../utility/helper.js';

export async function getDashboard({ date, limit = 10, role, year, month, week } = {}) {
  const currentDate = formatQueryDate(date);

  const [
    students,
    teachers,
    staff,
    departments,
    fees,
    studentAnalytics,
    timetableDay,
    notices,
    events,
  ] = await Promise.all([
    dashboardRepository.getStudentOverviewStats(),
    dashboardRepository.getTeacherOverviewStats(),
    dashboardRepository.getStaffOverviewStats(),
    dashboardRepository.getDepartmentCount(),
    dashboardRepository.getFeeCollectionOverviewStats({ year, month, week }),
    dashboardRepository.getStudentAttendanceOverviewStats(),
    dashboardRepository.getTimetableDayData(currentDate),
    dashboardRepository.getDashboardNotices(role, limit, currentDate),
    dashboardRepository.getDashboardEvents(currentDate),
  ]);

  return {
    students,
    teachers,
    staff,
    departments,
    fees,
    studentAnalytics,
    classesToday: timetableDay.stats,
    classes: timetableDay.classes,
    notices,
    events,
  };
}

export async function getTeacherDashboard({ userId, employeeId } = {}) {
  const currentDate = formatQueryDate();
  if (!userId && !employeeId) {
    return {
      classesSummary: [],
      todayClassesCount: 0,
      evaluationData: [],
      upcomingDeadlines: [],
    };
  }
  const [
    classesRows,
    evaluationData,
    classesDateWiseRows,
    upcomingDeadlines,
  ] = await Promise.all([
      dashboardRepository.getTeacherDashboardClasses(userId)  ,
      dashboardRepository.getMyTeacherDashboardEvaluation(userId)  ,
      dashboardRepository.getTeacherDashboardClasses(userId, currentDate)  ,
      dashboardRepository.getTeacherUpcomingDeadlines(employeeId, userId),
  ]);
  const classesSummary = getClassSummary(classesRows?.rows || [], classesRows?.attendanceData || []);

  return {
    classesSummary: classesSummary,
    todayClassesCount: classesDateWiseRows?.total || 0,
    evaluationData: evaluationData,
    upcomingDeadlines: upcomingDeadlines,
  };
}

export async function getMyTeacherDashboardDateWiseClasses({userId,date} = {}) {
    const formateDate = formatQueryDate(date);
  try {
    const classesDateWiseRows = await dashboardRepository.getTeacherDashboardClasses(userId, formateDate);
    const result = addAttendanceToSubjects(classesDateWiseRows.rows,classesDateWiseRows.attendanceData);
    return result;
  } catch (error) {
    throw new Error("Failed to get teacher dashboard date wise classes", error);
  }
}


function addAttendanceToSubjects(timeTableData, attendanceData) {
  return timeTableData.map((item) => {
    const attendance = attendanceData.filter((record) => record.timeTableCellDateWiseId === item.timeTableCellDateWiseId);
    return {
      ...item,
      isAttendance: Boolean(attendance.length > 0)
    };
  });
}

function getClassSummary(timeTableData, attendanceData) {
  const groups = new Map();

  for (const item of timeTableData) {
    const routine = item.timeTableCell?.timeTableRoutine;
    const course = routine?.timeTableCourse;
    const sectionInfo =
      routine?.timeTableClassSectionTerm?.classSection;
    const subject = item.timeTableSubject;

    const key = [
      course?.courseId,
      sectionInfo?.classSectionsId,
      subject?.subjectId,
    ].join("-");

    if (!groups.has(key)) {
      groups.set(key, {
        courseName: course?.courseName,
        courseCode: course?.courseCode,
        section: sectionInfo?.section,
        subjectName: subject?.subjectName,
        subjectCode: subject?.subjectCode,
        plannedClasses: 0,
        classesConducted: 0,
        totalStudents: 0,
        presentStudents: 0,
        attendanceAverage: 0,
        status: "Pending",
      });
    }

    const group = groups.get(key);
    group.plannedClasses += 1;

    const records = attendanceData.filter(
      (a) =>
        a.timeTableCellDateWiseId ===
          item.timeTableCellDateWiseId &&
        a.classSectionsId === sectionInfo?.classSectionsId &&
        a.deletedAt == null
    );

    // Count a class as conducted if attendance is recorded.
    if (records.length > 0) {
      group.classesConducted += 1;
    }

    group.totalStudents += records.length;
    group.presentStudents += records.filter(
      (a) => a.attendanceStatus === "Present"
    ).length;
  }

  return Array.from(groups.values()).map((group) => {
    group.attendanceAverage =
      group.totalStudents > 0
        ? Number(((group.classesConducted / group.plannedClasses) * 100).toFixed(2))
        : 0;

    if (group.classesConducted === 0) {
      group.status = "Pending";
    } else if (group.attendanceAverage >= 75) {
      group.status = "Good";
    } else {
      group.status = "Low";
    }

    return group;
  });
}

export async function getMyTeacherTaskDuty({
  userId,
  employeeId,
  filter = 'all',
  date,
} = {}) {
  const queryDate = date ? formatQueryDate(date) : null;

  const [classesResult, evaluationData, examDutyRows] = await Promise.all([
    dashboardRepository.getTeacherDashboardClasses(userId, queryDate),
    dashboardRepository.getTeacherEvaluationTasks(employeeId, userId),
    dashboardRepository.getTeacherExamDutyTasks(userId, queryDate),
  ]);

  const teachingTasks = addAttendanceToSubjects(
    classesResult?.rows || [],
    classesResult?.attendanceData || []
  ).map((item) => ({
    ...item,
    type: 'Teaching',
    title: item.timeTableSubject?.subjectName || item.timeTableElective?.electiveSubjectName || 'Teaching',
  }));

  const evaluationTasks = [
    ...(evaluationData?.evaluations || []).map((item) => ({
      ...item,
      type: 'Evaluation',
      title: item.subjectEvalution?.subjectName || 'Evaluation',
    })),
    ...(evaluationData?.teacherExamAssignments || []).map((item) => ({
      ...item,
      type: 'Evaluation',
      title: item.examSchedule?.subjectSchedule?.subjectName || 'Paper Setting',
    })),
    ...(evaluationData?.sheetAssignments || []).map((item) => ({
      ...item,
      type: 'Evaluation',
      title: 'Answer Sheet Evaluation',
    })),
  ];

  const examDutyTasks = (examDutyRows || []).map((item) => ({
    ...item,
    type: 'Exam Duty',
    title: item.role ? `${item.role} Duty` : 'Exam Duty',
  }));

  const summary = {
    all: teachingTasks.length + evaluationTasks.length + examDutyTasks.length,
    teaching: teachingTasks.length,
    evaluation: evaluationTasks.length,
    examDuty: examDutyTasks.length,
  };

  const cleanFilter = String(filter || 'all').trim().toLowerCase().replace(/[\s_-]+/g, '');

  let tasks = [];
  if (cleanFilter === 'teaching') {
    tasks = teachingTasks;
  } else if (cleanFilter === 'evaluation') {
    tasks = evaluationTasks;
  } else if (cleanFilter === 'examduty') {
    tasks = examDutyTasks;
  } else {
    tasks = [...teachingTasks, ...evaluationTasks, ...examDutyTasks];
  }

  return {
    summary,
    tasks,
  };
}

