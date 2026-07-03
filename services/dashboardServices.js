import * as dashboardRepository from '../repository/dashboardRepository.js';
import { formatQueryDate, resolveOverviewDateFromMonthYear } from '../utility/helper.js';

export async function getDashboardOverview({ year, month } = {}) {
  const currentDate = resolveOverviewDateFromMonthYear({ year, month });

  const [students, teachers, staff, departments, classesToday] = await Promise.all([
    dashboardRepository.getStudentOverviewStats(),
    dashboardRepository.getTeacherOverviewStats(),
    dashboardRepository.getStaffOverviewStats(),
    dashboardRepository.getDepartmentCount(),
    dashboardRepository.getClassesTodayStats(currentDate),
  ]);

  return {
    students,
    teachers,
    staff,
    departments,
    classesToday,
  };
}

export async function getFeeOverview({ year, month, week } = {}) {
  return dashboardRepository.getFeeCollectionOverviewStats({ year, month, week });
}

export async function getStudentAttendanceOverview() {
  return dashboardRepository.getStudentAttendanceOverviewStats();
}

export async function getTodaysClasses(dateInput) {
  const currentDate = formatQueryDate(dateInput);
  return dashboardRepository.getTodaysClasses(currentDate);
}

export async function getDashboardNotices(role, limit, dateInput) {
  const currentDate = formatQueryDate(dateInput);
  return dashboardRepository.getDashboardNotices(role, limit, currentDate);
}
