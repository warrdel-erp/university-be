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

function toPlain(row) {
  return row?.get ? row.get({ plain: true }) : row;
}

function addId(set, id) {
  if (id) set.add(Number(id));
}

function collectTeacherDashboardIds(subjectMappings, scheduleMappings, sectionMappings) {
  const courseIds = new Set();
  const subjectIds = new Set();
  const classSectionTermIds = new Set();

  for (const row of subjectMappings) {
    const mapping = toPlain(row);
    const subject = mapping.employeeSubject;
    addId(subjectIds, subject?.subjectId);
    addId(courseIds, subject?.courseId);
  }

  for (const row of scheduleMappings) {
    const schedule = toPlain(row);
    const routine = schedule.timeTablecreate;
    addId(classSectionTermIds, routine?.classSectionTermId);
    addId(courseIds, routine?.courseId);
    addId(courseIds, schedule.timeTableSubject?.courseId);
    addId(courseIds, schedule.timeTableTeacherSubject?.employeeSubject?.courseId);
    addId(subjectIds, schedule.timeTableSubject?.subjectId);
    addId(subjectIds, schedule.timeTableTeacherSubject?.employeeSubject?.subjectId);
  }

  for (const row of sectionMappings) {
    const mapping = toPlain(row);
    const section = mapping.employeeSection;
    addId(courseIds, section?.courseId);
    for (const term of section?.classSectionTerms || []) {
      addId(classSectionTermIds, term.classSectionTermId);
    }
  }

  return {
    courseIds: [...courseIds],
    subjectIds: [...subjectIds],
    classSectionTermIds: [...classSectionTermIds],
  };
}

export async function getTeacherDashboard({ employeeId } = {}) {
  const currentDate = formatQueryDate();
  const teacher = await dashboardRepository.getTeacherDashboardEmployee(employeeId);
  if (!teacher) {
    const error = new Error('Teacher not found');
    error.statusCode = 404;
    throw error;
  }

  const [
    subjectMappings,
    sectionMappings,
    scheduleMappings,
    examAssignments,
    upcomingClassRows,
  ] = await Promise.all([
    dashboardRepository.getTeacherDashboardSubjectMappings(employeeId),
    dashboardRepository.getTeacherDashboardSectionMappings(employeeId),
    dashboardRepository.getTeacherDashboardScheduleMappings(employeeId),
    dashboardRepository.getTeacherDashboardExamAssignments(employeeId),
    dashboardRepository.getTeacherDashboardUpcomingClasses(employeeId, currentDate),
  ]);

  const ids = collectTeacherDashboardIds(subjectMappings, scheduleMappings, sectionMappings);

  const totalStudents = await dashboardRepository.countTeacherDashboardStudents(
    ids.classSectionTermIds,
    ids.courseIds,
  );

  return {
    studentsCount: totalStudents,
    subjectsCount: ids.subjectIds.length,
    coursesCount: ids.courseIds.length,
    examScheduledForPaperCreationCount: examAssignments,
    upcomingClassesCount: upcomingClassRows,
  };
}
