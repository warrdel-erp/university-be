import { Op, fn, col, where, literal, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { ROLES } from '../const/roles.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { dayNameFromQueryDate, parseLocalDateOnly } from '../utility/helper.js';
import { decimalSubtract, toMoneyNumber } from '../utility/decimalMoney.js';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const GROWTH_PERIODS = {
  weekly: 7,
  monthly: 30,
};

function routineActiveOnDateWhere(currentDate) {
  return {
    is_publish: true,
    [Op.and]: [
      Sequelize.where(Sequelize.fn('DATE', Sequelize.col('starting_date')), { [Op.lte]: currentDate }),
      Sequelize.where(Sequelize.fn('DATE', Sequelize.col('ending_date')), { [Op.gte]: currentDate }),
    ],
  };
}

function subtractDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function calculateGrowthPercent(currentCount, previousCount) {
  if (previousCount === 0) {
    if (currentCount > 0) {
      return 100;
    }
    return 0;
  }
  return Math.round(((currentCount - previousCount) / previousCount) * 1000) / 10;
}

function buildDateCutoffWhere(dateExpression, cutoffDate) {
  if (typeof dateExpression === 'function') {
    return where(dateExpression(), { [Op.lte]: cutoffDate });
  }
  return { [dateExpression]: { [Op.lte]: cutoffDate } };
}

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

const teacherUserInclude = [
  {
    model: model.userModel,
    as: 'user',
    attributes: [],
    required: true,
    include: [
      {
        model: model.userRoleModel,
        as: 'userRoles',
        attributes: [],
        where: { role: ROLES.TEACHER },
        required: true,
      },
    ],
  },
];

const studentEnrollmentDate = () => fn('COALESCE', col('students.admission_date'), col('students.created_at'));

export async function getStudentOverviewStats() {
  return getCountWithGrowth(model.studentModel, studentEnrollmentDate);
}

export async function getTeacherOverviewStats() {
  return getCountWithGrowth(model.employeeModel, 'createdAt', { include: teacherUserInclude });
}

export async function getStaffOverviewStats() {
  return getCountWithGrowth(model.staffModel, 'createdAt');
}

export async function getDepartmentCount() {
  const count = await scoped(model.subAccountModel).count();
  return { count };
}

function timeToMinutes(timeValue) {
  const parts = String(timeValue).split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function isPeriodInProgress(now, startTime, endTime) {
  if (!startTime || !endTime) {
    return false;
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return nowMinutes >= timeToMinutes(startTime) && nowMinutes < timeToMinutes(endTime);
}

function formatClassStartTime(startTime) {
  if (!startTime) {
    return '';
  }
  const parts = String(startTime).split(':');
  const hour = parts[0].padStart(2, '0');
  const minute = (parts[1] ?? '00').padStart(2, '0');
  return `${hour}:${minute}`;
}

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

function toClassResponseItem(classItem) {
  return {
    time: classItem.time,
    subject: classItem.subject,
    teacher: classItem.teacher,
    room: classItem.room,
    status: classItem.status,
  };
}

function prepareTodaysClassList(schedules, now, currentDate) {
  const upcomingClasses = [];
  const todaysClasses = [];

  for (const schedule of schedules) {
    const period = schedule.timeTablecreation;
    const startTime = period?.startTime;
    const classItem = {
      time: formatClassStartTime(startTime),
      subject: resolveSubjectName(schedule),
      teacher: schedule.employeeDetails?.employeeName ?? '',
      room: schedule.classRoom?.roomNumber ?? '',
      status: getClassTimelineStatus(startTime, period?.endTime, now, currentDate),
      sortMinutes: timeToMinutes(startTime),
    };

    if (classItem.status === 'Upcoming') {
      upcomingClasses.push(classItem);
    } else {
      todaysClasses.push(classItem);
    }
  }

  upcomingClasses.sort((first, second) => first.sortMinutes - second.sortMinutes);
  todaysClasses.sort((first, second) => first.sortMinutes - second.sortMinutes);

  const upcoming = [];
  for (const classItem of upcomingClasses) {
    upcoming.push(toClassResponseItem(classItem));
  }

  const today = [];
  for (const classItem of todaysClasses) {
    today.push(toClassResponseItem(classItem));
  }

  return { upcomingClasses: upcoming, todaysClasses: today };
}

export async function getClassesTodayStats(currentDate) {
  const dayName = dayNameFromQueryDate(currentDate);
  const now = new Date();

  const schedules = await scoped(model.classScheduleModel).findAll({
    attributes: ['timeTableMappingId'],
    where: { day: dayName },
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        attributes: [],
        where: routineActiveOnDateWhere(currentDate),
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        required: true,
        attributes: ['startTime', 'endTime'],
        where: { isBreak: false },
      },
    ],
    raw: true,
    nest: true,
  });

  let inProgressCount = 0;
  for (const schedule of schedules) {
    const period = schedule.timeTablecreation;
    if (isPeriodInProgress(now, period.startTime, period.endTime)) {
      inProgressCount += 1;
    }
  }

  return {
    total: schedules.length,
    inProgress: inProgressCount,
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

const GENERATED_INVOICE_WHERE = { status: 'generated' };

const PENDING_INVOICE_WHERE = {
  status: 'generated',
  paymentStatus: { [Op.in]: ['unpaid', 'partial'] },
};

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

export async function getTodaysClasses(currentDate) {
  const dayName = dayNameFromQueryDate(currentDate);
  const now = new Date();

  const schedules = await scoped(model.classScheduleModel).findAll({
    raw: true,
    nest: true,
    where: { day: dayName },
    attributes: ['timeTableMappingId', 'period', 'timeTableType'],
    include: [
      {
        model: model.timeTableRoutineModel,
        as: 'timeTablecreate',
        required: true,
        attributes: [],
        where: {
          ...routineActiveOnDateWhere(currentDate),
          ...buildScope(model.timeTableRoutineModel),
        },
      },
      {
        model: model.timeTableStructurePeriodsModel,
        as: 'timeTablecreation',
        required: true,
        attributes: ['startTime', 'endTime'],
        where: { isBreak: false },
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

  return prepareTodaysClassList(schedules, now, currentDate);
}

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

function getNoticeEffectiveDate(notice) {
  if (notice.noticeDate) {
    return notice.noticeDate;
  }
  return notice.publishDate;
}

function toNoticeResponseItem(notice) {
  const plain = notice.get({ plain: true });
  if (typeof plain.messageTo === 'string') {
    plain.messageTo = JSON.parse(plain.messageTo);
  }
  return plain;
}

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
