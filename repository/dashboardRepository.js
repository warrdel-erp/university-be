import { Op, fn, col, where, literal, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { ROLES } from '../const/roles.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { formatQueryDate, parseLocalDateOnly } from '../utility/helper.js';
import { decimalSubtract, toMoneyNumber } from '../utility/decimalMoney.js';

// Month labels for fee collection graph when grouped by year.
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Day offsets used to compute weekly and monthly growth baselines.
const GROWTH_PERIODS = {
  weekly: 7,
  monthly: 30,
};

// Returns a new date shifted back by the given number of days.
function subtractDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

// Percent change from baseline count to current count, one decimal place.
function calculateGrowthPercent(currentCount, previousCount) {
  if (previousCount === 0) {
    if (currentCount > 0) {
      return 100;
    }
    return 0;
  }
  return Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
}

// Sequelize where clause for records on or before a cutoff date.
function buildDateCutoffWhere(dateExpression, cutoffDate) {
  if (typeof dateExpression === 'function') {
    return where(dateExpression(), { [Op.lte]: cutoffDate });
  }
  return { [dateExpression]: { [Op.lte]: cutoffDate } };
}

// Total count plus weekly/monthly growth from a historical baseline.
export async function getCountWithGrowth(modelRef, dateField, options = {}) {
  const { where: extraWhere = {}, include } = options;

  const countAtCutoff = async (periodKey) => {
    const cutoff = subtractDays(new Date(), GROWTH_PERIODS[periodKey]);
    const whereClause = { ...extraWhere };

    if (typeof dateField === 'function') {
      whereClause[Op.and] = [...(extraWhere[Op.and] || []), buildDateCutoffWhere(dateField, cutoff)];
    } else {
      whereClause[dateField] = { [Op.lte]: cutoff };
    }

    return scoped(modelRef).count({ where: whereClause, include });
  };

  const [count, weeklyBaseline, monthlyBaseline] = await Promise.all([
    scoped(modelRef).count({ where: extraWhere, include }),
    countAtCutoff('weekly'),
    countAtCutoff('monthly'),
  ]);

  return {
    count,
    weeklyGrowth: calculateGrowthPercent(count, weeklyBaseline),
    monthlyGrowth: calculateGrowthPercent(count, monthlyBaseline),
  };
}

// Restricts employees to users with TEACHER role.
const teacherUserInclude = [
  {
    model: model.userModel,
    as: 'user',
    attributes: [],
    required: true,
    include: [
      {
        model: model.userRolePermissionModel,
        as: 'userRolePermissions',
        attributes: [],
        required: true,
        include: [
          {
            model: model.roleModel,
            as: 'userRole',
            attributes: [],
            where: { role: ROLES.TEACHER },
            required: true,
          },
        ],
      },
    ],
  },
];

// Enrollment date falls back to created_at when admission_date is null.
const studentEnrollmentDate = () => fn('COALESCE', col('students.admission_date'), col('students.created_at'));

// Student KPI count and growth for the dashboard card.
export async function getStudentOverviewStats() {
  return getCountWithGrowth(model.studentModel, studentEnrollmentDate);
}

// Teacher KPI count and growth for the dashboard card.
export async function getTeacherOverviewStats() {
  return getCountWithGrowth(model.employeeModel, 'createdAt', { include: teacherUserInclude });
}

// Staff KPI count and growth for the dashboard card.
export async function getStaffOverviewStats() {
  return getCountWithGrowth(model.staffModel, 'createdAt');
}

// College department count from scoped sub_account rows.
export async function getDepartmentCount() {
  const count = await scoped(model.subAccountModel).count();
  return { count };
}

// Converts HH:mm time string to minutes from midnight.
function timeToMinutes(timeValue) {
  const parts = String(timeValue).split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

// True when current clock time is within period start and end.
function isPeriodInProgress(now, startTime, endTime) {
  if (!startTime || !endTime) {
    return false;
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= timeToMinutes(startTime) && nowMinutes < timeToMinutes(endTime);
}

// Normalizes period start time to HH:mm for API response.
function formatClassStartTime(startTime) {
  if (!startTime) {
    return '';
  }
  const parts = String(startTime).split(':');
  const hour = parts[0].padStart(2, '0');
  const minute = (parts[1] ?? '00').padStart(2, '0');
  return `${hour}:${minute}`;
}

// Subject label from normal, elective, or teacher-subject mapping.
function resolveSubjectName(schedule) {
  if (schedule.timeTableSubject?.subjectName) {
    return schedule.timeTableSubject.subjectName;
  }
  if (schedule.timeTableElective?.electiveSubjectName) {
    return schedule.timeTableElective.electiveSubjectName;
  }
  if (schedule.timeTableTeacherSubject?.employeeSubject?.subjectName) {
    return schedule.timeTableTeacherSubject.employeeSubject.subjectName;
  }
  return '';
}

// Upcoming, In Progress, or Completed from selected date and clock time.
function getClassTimelineStatus(startTime, endTime, now, currentDate) {
  if (!startTime || !endTime) {
    return 'Upcoming';
  }

  const selectedDate = parseLocalDateOnly(currentDate);
  const today = parseLocalDateOnly(new Date());

  if (selectedDate > today) {
    return 'Upcoming';
  }
  if (selectedDate < today) {
    return 'Completed';
  }

  if (isPeriodInProgress(now, startTime, endTime)) {
    return 'In Progress';
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  if (nowMinutes < timeToMinutes(startTime)) {
    return 'Upcoming';
  }
  return 'Completed';
}

// Strips internal sort field from class list item.
function toClassResponseItem(classItem) {
  return {
    time: classItem.time,
    subject: classItem.subject,
    teacher: classItem.teacher,
    room: classItem.room,
    status: classItem.status,
  };
}

// Splits timetable slots into upcoming and today class lists.
function prepareTodaysClassList(todayItems, futureItems) {
  const upcomingClasses = [];
  const todaysClasses = [];

  for (const classItem of todayItems) {
    if (classItem.status === 'Upcoming') {
      upcomingClasses.push(classItem);
    } else {
      todaysClasses.push(classItem);
    }
  }

  upcomingClasses.sort((first, second) => first.sortMinutes - second.sortMinutes);
  todaysClasses.sort((first, second) => {
    if (first.status === 'In Progress' && second.status !== 'In Progress') {
      return -1;
    }
    if (first.status !== 'In Progress' && second.status === 'In Progress') {
      return 1;
    }
    return first.sortMinutes - second.sortMinutes;
  });
  futureItems.sort((first, second) => {
    if (first.sortDate !== second.sortDate) {
      return first.sortDate.localeCompare(second.sortDate);
    }
    return first.sortMinutes - second.sortMinutes;
  });

  const combinedUpcoming = [...upcomingClasses, ...futureItems].slice(0, 3);
  const limitedToday = todaysClasses.slice(0, 2);

  const upcoming = [];
  for (const classItem of combinedUpcoming) {
    upcoming.push(toClassResponseItem(classItem));
  }

  const today = [];
  for (const classItem of limitedToday) {
    today.push(toClassResponseItem(classItem));
  }

  return { upcomingClasses: upcoming, todaysClasses: today };
}

// Total and in-progress class counts from fetched schedules.
function buildClassesTodayStats(todayItems, now) {
  let inProgressCount = 0;
  for (const classItem of todayItems) {
    if (classItem.status === 'In Progress') {
      inProgressCount += 1;
    }
  }

  return {
    total: todayItems.length,
    inProgress: inProgressCount,
  };
}

// Single timetable fetch returning classesToday stats and class timeline.
export async function getTimetableDayData(currentDate) {
  const now = new Date();
  const horizon = parseLocalDateOnly(currentDate);
  horizon.setDate(horizon.getDate() + 30);
  const horizonDate = formatQueryDate(horizon);
  const todayDateString = formatQueryDate(currentDate);

  const schedules = await scoped(model.classScheduleModel).findAll({
    raw: true,
    nest: true,
    attributes: [
      'timeTableMappingId',
      'timeTableRoutineId',
      'timeTableCreationId',
      'period',
      'timeTableType',
      'day',
      'teacherType',
    ],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        attributes: ['startingDate', 'endingDate'],
        where: {
          isPublish: true,
          [Op.and]: [
            Sequelize.where(Sequelize.fn('DATE', Sequelize.col('starting_date')), { [Op.lte]: horizonDate }),
            Sequelize.where(Sequelize.fn('DATE', Sequelize.col('ending_date')), { [Op.gte]: currentDate }),
          ],
          ...buildScope(model.timeTableRoutineModel),
        },
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        required: true,
        attributes: ['startTime', 'endTime'],
        where: {
          [Op.or]: [{ isBreak: false }, { isBreak: { [Op.is]: null } }],
        },
      },
      {
        model: model.employeeModel,
        as: 'employeeDetails',
        required: false,
        attributes: ['employeeName'],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        required: false,
        attributes: ['teacherSubjectMappingId'],
        include: [
          {
            model: model.subjectModel,
            as: 'employeeSubject',
            attributes: ['subjectName'],
          },
        ],
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        required: false,
        attributes: ['subjectName'],
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        required: false,
        attributes: ['electiveSubjectName'],
      },
      {
        model: model.classRoomModel,
        as: 'classRoom',
        required: false,
        attributes: ['roomNumber'],
      },
    ],
  });

  schedules.sort((a, b) => {
    const aPrimary = String(a.teacherType ?? '').toLowerCase() === 'primary';
    const bPrimary = String(b.teacherType ?? '').toLowerCase() === 'primary';
    if (aPrimary && !bPrimary) {
      return -1;
    }
    if (!aPrimary && bPrimary) {
      return 1;
    }
    return 0;
  });

  const from = parseLocalDateOnly(currentDate);
  const to = parseLocalDateOnly(horizonDate);
  const todayBySlot = new Map();
  const futureBySlot = new Map();

  for (const schedule of schedules) {
    const routine = schedule.timeTablecreate;
    if (!routine?.startingDate || !routine?.endingDate) {
      continue;
    }

    const dayIndex = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
      thursday: 4, friday: 5, saturday: 6,
    }[String(schedule.day ?? '').toLowerCase()];
    if (dayIndex === undefined) {
      continue;
    }

    const routineStart = parseLocalDateOnly(routine.startingDate);
    const routineEnd = parseLocalDateOnly(routine.endingDate);
    let occurrence = new Date(routineStart);
    while (occurrence.getDay() !== dayIndex && occurrence <= routineEnd) {
      occurrence.setDate(occurrence.getDate() + 1);
    }

    while (occurrence <= routineEnd) {
      if (occurrence >= from && occurrence <= to) {
        const occurrenceDate = formatQueryDate(occurrence);
        const period = schedule.timeTablecreation;
        const startTime = period?.startTime;
        const slotKey = `${occurrenceDate}|${schedule.timeTableRoutineId}|${schedule.period}`;
        const targetMap = occurrenceDate === todayDateString
          ? todayBySlot
          : occurrenceDate > todayDateString
            ? futureBySlot
            : null;

        if (targetMap) {
          const existing = targetMap.get(slotKey);
          const isPrimary = String(schedule.teacherType ?? '').toLowerCase() === 'primary';
          const existingIsPrimary = existing
            && String(existing.teacherType ?? '').toLowerCase() === 'primary';
          if (!existing || (isPrimary && !existingIsPrimary)) {
            targetMap.set(slotKey, {
              time: formatClassStartTime(startTime),
              subject: resolveSubjectName(schedule),
              teacher: schedule.employeeDetails?.employeeName ?? '',
              room: schedule.classRoom?.roomNumber ?? '',
              status: getClassTimelineStatus(startTime, period?.endTime, now, occurrenceDate),
              sortMinutes: timeToMinutes(startTime),
              sortDate: occurrenceDate,
              teacherType: schedule.teacherType,
            });
          }
        }
      }
      occurrence.setDate(occurrence.getDate() + 7);
    }
  }

  const todayItems = [];
  for (const classItem of todayBySlot.values()) {
    todayItems.push(classItem);
  }
  const futureItems = [];
  for (const classItem of futureBySlot.values()) {
    futureItems.push(classItem);
  }

  return {
    stats: buildClassesTodayStats(todayItems, now),
    classes: prepareTodaysClassList(todayItems, futureItems),
  };
}

// Builds year / month / week filters for Sequelize date columns.
function getDateFilterConditions(dateColumn, { year, month, week }) {
  const selectedYear = year ?? new Date().getFullYear();
  const conditions = [where(fn('YEAR', dateColumn), selectedYear)];

  if (week != null) {
    conditions.push(where(fn('WEEK', dateColumn, 1), week));
    return conditions;
  }

  if (month != null) {
    conditions.push(where(fn('MONTH', dateColumn), month));
  }

  return conditions;
}

// Only generated invoices count toward fee totals.
const GENERATED_INVOICE_WHERE = { status: 'generated' };

// Unpaid or partially paid generated invoices for pending amount.
const PENDING_INVOICE_WHERE = {
  status: 'generated',
  paymentStatus: { [Op.in]: ['unpaid', 'partial'] },
};

// Invoice filter for fee collection graph query.
function getGraphInvoiceWhereClause(dateFilters) {
  return {
    [Op.and]: [
      { status: 'generated' },
      ...getDateFilterConditions(col('student_fee_invoice.create_date'), dateFilters),
    ],
  };
}

// Graph bucket size follows the narrowest filter: week → day of week, month → day, year → month.
function getGraphConfiguration(dateColumn, dateFilters) {
  if (dateFilters.week != null) {
    return {
      groupExpression: fn('WEEKDAY', dateColumn),
      groupResultAlias: 'bucket',
      getBucketLabel: (value) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][Number(value)],
    };
  }

  if (dateFilters.month != null) {
    return {
      groupExpression: fn('DAY', dateColumn),
      groupResultAlias: 'bucket',
      getBucketLabel: (value) => String(value),
    };
  }

  return {
    groupExpression: fn('MONTH', dateColumn),
    groupResultAlias: 'bucket',
    getBucketLabel: (value) => MONTH_LABELS[Number(value) - 1],
  };
}

// Maps grouped SQL rows to collectionGraph label/amount pairs.
function prepareGraphData(graphRecords, getBucketLabel) {
  const collectionGraph = [];
  for (const record of graphRecords) {
    collectionGraph.push({
      label: getBucketLabel(record.bucket),
      amount: Math.round(toMoneyNumber(record.amount ?? 0)),
    });
  }
  return collectionGraph;
}

// Fee cards and collection graph for the dashboard.
export async function getFeeCollectionOverviewStats({ year, month, week } = {}) {
  const dateFilters = { year, month, week };
  const invoiceDateColumn = col('student_fee_invoice.create_date');
  const graphConfiguration = getGraphConfiguration(invoiceDateColumn, dateFilters);
  const graphInvoiceWhereClause = getGraphInvoiceWhereClause(dateFilters);

  const [collectedRecord, pendingRecord, graphRecords] = await Promise.all([
    scoped(model.studentFeeInvoiceModel).findOne({
      attributes: [[fn('SUM', col('student_fee_invoice.paid_amount')), 'collectedAmount']],
      where: GENERATED_INVOICE_WHERE,
      raw: true,
    }),
    scoped(model.studentFeeInvoiceModel).findOne({
      attributes: [
        [fn('SUM', col('student_fee_invoice.total')), 'totalAmount'],
        [fn('SUM', col('student_fee_invoice.paid_amount')), 'paidAmount'],
      ],
      where: PENDING_INVOICE_WHERE,
      raw: true,
    }),
    scoped(model.studentFeeInvoiceModel).findAll({
      attributes: [
        [graphConfiguration.groupExpression, graphConfiguration.groupResultAlias],
        [fn('SUM', col('student_fee_invoice.paid_amount')), 'amount'],
      ],
      where: graphInvoiceWhereClause,
      group: [graphConfiguration.groupExpression],
      order: [[graphConfiguration.groupExpression, 'ASC']],
      raw: true,
    }),
  ]);

  const collectedAmount = Math.round(toMoneyNumber(collectedRecord?.collectedAmount ?? 0));
  const pendingTotalAmount = toMoneyNumber(pendingRecord?.totalAmount ?? 0);
  const pendingPaidAmount = toMoneyNumber(pendingRecord?.paidAmount ?? 0);
  const pendingAmount = Math.round(decimalSubtract(pendingTotalAmount, pendingPaidAmount));

  const totalOutstandingAndCollected = toMoneyNumber(collectedAmount) + toMoneyNumber(pendingAmount);
  let collectionEfficiency = 0;
  if (totalOutstandingAndCollected > 0) {
    collectionEfficiency = Math.round((collectedAmount / totalOutstandingAndCollected) * 1000) / 10;
  }

  return {
    collectedAmount,
    pendingAmount,
    collectionEfficiency,
    collectionGraph: prepareGraphData(graphRecords, graphConfiguration.getBucketLabel),
  };
}

// Adds percentage share per course to student analytics output.
function prepareDepartmentDistribution(departmentRecords) {
  let totalStudents = 0;
  for (const record of departmentRecords) {
    totalStudents += Number(record.studentCount);
  }

  const departmentDistribution = [];
  for (const record of departmentRecords) {
    const studentCount = Number(record.studentCount);
    let percentage = 0;
    if (totalStudents > 0) {
      percentage = Math.round((studentCount / totalStudents) * 100);
    }
    departmentDistribution.push({
      departmentName: record.departmentName,
      studentCount,
      percentage,
    });
  }

  return { totalStudents, departmentDistribution };
}

// Student count per course for the distribution chart.
export async function getStudentAttendanceOverviewStats() {
  const [courses, studentCountRows] = await Promise.all([
    scoped(model.courseModel).findAll({
      attributes: ['courseId', 'courseName'],
      order: [['courseName', 'ASC']],
      raw: true,
    }),
    scoped(model.studentModel).findAll({
      attributes: [
        'courseId',
        [fn('COUNT', col('students.student_id')), 'studentCount'],
      ],
      group: [col('students.course_id')],
      raw: true,
    }),
  ]);

  const studentCountByCourseId = new Map();
  for (const row of studentCountRows) {
    studentCountByCourseId.set(row.courseId, Number(row.studentCount));
  }

  const courseRecords = [];
  for (const course of courses) {
    const studentCount = studentCountByCourseId.get(course.courseId);
    courseRecords.push({
      departmentName: course.courseName,
      studentCount: studentCount != null ? studentCount : 0,
    });
  }

  courseRecords.sort((first, second) => {
    if (second.studentCount !== first.studentCount) {
      return second.studentCount - first.studentCount;
    }
    return first.departmentName.localeCompare(second.departmentName);
  });

  return prepareDepartmentDistribution(courseRecords);
}

// JSON_CONTAINS filter for notice audience messageTo array.
function messageToContains(target) {
  return literal(`JSON_CONTAINS(message_to, '"${target}"')`);
}

// Dashboard notice board respects the same audience rules as the notice module.
function getNoticeAudienceWhereClause(role) {
  const normalizedRole = String(role ?? '').toUpperCase();

  if (normalizedRole === ROLES.ADMIN) {
    return {};
  }

  if (normalizedRole === ROLES.TEACHER) {
    return {
      [Op.or]: [
        messageToContains(ROLES.ADMIN),
        messageToContains(ROLES.TEACHER),
        messageToContains(ROLES.STUDENT),
      ],
    };
  }

  return {
    [Op.or]: [messageToContains(ROLES.STUDENT), messageToContains('Student')],
  };
}

// Display date prefers noticeDate over publishDate.
function getNoticeEffectiveDate(notice) {
  if (notice.noticeDate) {
    return notice.noticeDate;
  }
  return notice.publishDate;
}

// Sequelize row to plain notice object with parsed messageTo.
function toNoticeResponseItem(notice) {
  const plain = notice.get({ plain: true });
  if (typeof plain.messageTo === 'string') {
    plain.messageTo = JSON.parse(plain.messageTo);
  }
  return plain;
}

// Today and upcoming notices capped by limit for the notice board.
export async function getDashboardNotices(role, limit = 10, currentDate) {
  const audienceWhere = getNoticeAudienceWhereClause(role);

  const notices = await scoped(model.noticeModel).findAll({
    attributes: ['noticeId', 'title', 'notice', 'noticeDate', 'publishDate', 'messageTo', 'role'],
    where: Object.keys(audienceWhere).length > 0 ? audienceWhere : undefined,
    order: [['noticeId', 'DESC']],
  });

  const todaysNotices = [];
  const upcomingNotices = [];

  for (const notice of notices) {
    const effectiveDate = getNoticeEffectiveDate(notice);
    if (!effectiveDate || effectiveDate < currentDate) {
      continue;
    }

    const item = toNoticeResponseItem(notice);

    if (effectiveDate === currentDate) {
      todaysNotices.push(item);
    } else {
      upcomingNotices.push({ item, effectiveDate });
    }
  }

  upcomingNotices.sort((first, second) => first.effectiveDate.localeCompare(second.effectiveDate));

  const upcoming = [];
  for (const row of upcomingNotices) {
    upcoming.push(row.item);
  }

  return {
    todaysNotices: todaysNotices.slice(0, limit),
    upcomingNotices: upcoming.slice(0, limit),
  };
}

// Institute jobs on the selected date as dashboard events.
export async function getDashboardEvents(currentDate) {
  const now = new Date();

  const jobs = await scoped(model.jobModel).findAll({
    where: { jobDate: currentDate },
    attributes: ['jobTitle', 'startTime', 'endTime', 'location'],
    order: [['startTime', 'ASC']],
  });

  const events = [];
  for (const job of jobs) {
    events.push({
      time: formatClassStartTime(job.startTime),
      title: job.jobTitle,
      location: job.location ?? '',
      status: getClassTimelineStatus(job.startTime, job.endTime, now, currentDate),
    });
  }

  return events;
}

export async function getTeacherDashboardEmployee(employeeId) {
  return scoped(model.employeeModel).findOne({
    where: { employeeId: Number(employeeId) },
    attributes: ['employeeId'],
  });
}

export async function getTeacherDashboardSubjectMappings(employeeId) {
  return scoped(model.teacherSubjectMappingModel).findAll({
    where: { employeeId: Number(employeeId) },
    attributes: ['subjectId'],
    include: [
      {
        model: model.subjectModel,
        as: 'employeeSubject',
        required: true,
        where: buildScope(model.subjectModel),
        attributes: ['subjectId', 'courseId'],
      },
    ],
  });
}

export async function getTeacherDashboardSectionMappings(employeeId) {
  return scoped(model.teacherSectionMappingModel).findAll({
    where: { employeeId: Number(employeeId) },
    attributes: ['classSectionsId'],
    include: [
      {
        model: model.classSectionModel,
        as: 'employeeSection',
        required: true,
        where: buildScope(model.classSectionModel),
        attributes: ['courseId'],
        include: [
          {
            model: model.classSectionTermModel,
            as: 'classSectionTerms',
            required: false,
            attributes: ['classSectionTermId'],
          },
        ],
      },
    ],
  });
}

export async function getTeacherDashboardScheduleMappings(employeeId) {
  return scoped(model.classScheduleModel).findAll({
    where: {
      [Op.or]: [
        { employeeId: Number(employeeId) },
        Sequelize.where(Sequelize.col('timeTableTeacherSubject.employee_id'), Number(employeeId)),
      ],
    },
    attributes: ['subjectId'],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        where: buildScope(model.timeTableRoutineModel),
        attributes: ['courseId', 'classSectionTermId'],
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        required: false,
        where: buildScope(model.subjectModel),
        attributes: ['subjectId', 'courseId'],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        required: false,
        attributes: ['employeeId', 'subjectId'],
        include: [
          {
            model: model.subjectModel,
            as: 'employeeSubject',
            required: false,
            where: buildScope(model.subjectModel),
            attributes: ['subjectId', 'courseId'],
          },
        ],
      },
    ],
  });
}

export async function countTeacherDashboardStudents(classSectionTermIds, courseIds) {
  if (classSectionTermIds.length > 0) {
    const directStudents = await scoped(model.studentModel).findAll({
      where: { classSectionTermId: { [Op.in]: classSectionTermIds } },
      attributes: ['studentId'],
    });
    const mappedStudents = await scoped(model.classStudentMapperModel).findAll({
      where: { classSectionTermId: { [Op.in]: classSectionTermIds } },
      attributes: ['studentId'],
      include: [
        {
          model: model.studentModel,
          as: 'studentMapped',
          required: true,
          where: buildScope(model.studentModel),
          attributes: [],
        },
      ],
    });

    const studentIds = new Set();
    for (const student of directStudents) {
      studentIds.add(Number(student.studentId));
    }
    for (const mapper of mappedStudents) {
      studentIds.add(Number(mapper.studentId));
    }
    return studentIds.size;
  }

  if (courseIds.length > 0) {
    return scoped(model.studentModel).count({
      where: { courseId: { [Op.in]: courseIds } },
    });
  }

  return 0;
}

export async function getTeacherDashboardExamAssignments(employeeId) {
  return scoped(model.teacherExamAssignmentModel).count({
    where: { employeeId: Number(employeeId) },
    include: [
      {
        model: model.examScheduleModel,
        as: 'examSchedule',
        required: true,
        where: buildScope(model.examScheduleModel),
        attributes: [],
      },
    ],
  });
}

export async function getTeacherDashboardUpcomingClasses(employeeId, currentDate) {
  return scoped(model.classScheduleModel).count({
    where: {
      [Op.or]: [
        { employeeId: Number(employeeId) },
        Sequelize.where(Sequelize.col('timeTableTeacherSubject.employee_id'), Number(employeeId)),
      ],
    },
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        where: {
          isPublish: true,
          endingDate: { [Op.gte]: currentDate },
          ...buildScope(model.timeTableRoutineModel),
        },
        attributes: [],
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        required: true,
        where: {
          [Op.or]: [{ isBreak: false }, { isBreak: { [Op.is]: null } }],
        },
        attributes: [],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        required: false,
        attributes: [],
      },
    ],
  });
}
