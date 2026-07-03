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
