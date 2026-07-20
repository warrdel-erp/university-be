import { Op, Sequelize } from 'sequelize';
import * as model from '../models/index.js';
import { buildScope } from '../utility/scoped.js';
import { timeTableRoutineClassSectionInclude } from '../utility/classSectionIncludes.js';

function routineActiveOnDateWhere(currentDate) {
  return {
    is_publish: true,
    [Op.and]: [
      Sequelize.where(Sequelize.fn('DATE', Sequelize.col('starting_date')), { [Op.lte]: currentDate }),
      Sequelize.where(Sequelize.fn('DATE', Sequelize.col('ending_date')), { [Op.gte]: currentDate }),
    ],
  };
}

function flattenDateWiseScheduleRow(row, viewerUserId = null) {
  const plain = row.get({ plain: true });
  const cell = plain.timeTableCell;
  const teachers = plain.timeTableCellTeachersDateWise || [];

  let teacher = teachers[0] || null;
  if (viewerUserId != null) {
    for (const rowTeacher of teachers) {
      if (Number(rowTeacher.userId) === Number(viewerUserId)) {
        teacher = rowTeacher;
        break;
      }
    }
  }

  const room = plain.classRoom || cell.classRoom;
  const routine = cell.timeTableRoutine;
  const classSectionTerm = routine?.timeTableClassSectionTerm;
  const classSection = classSectionTerm?.classSection;

  return {
    timeTableCellDateWiseId: plain.timeTableCellDateWiseId,
    timeTableCellId: plain.timeTableCellId,
    date: plain.date,
    timeTableType: cell.timeTableType,
    day: cell.day,
    period: cell.period,
    // Primary or Secondary — both get full class details below
    teacherType: teacher ? teacher.teacherType : null,
    isAttendence: teacher ? teacher.isAttendence : false,
    isSameTeacher: cell.isSameTeacher,
    timeTableNameId: cell.timeTableNameId,
    timeTableCreationId: cell.timeTableCreationId,
    timeTablecreate: routine,
    timeTablecreation: cell.timeTablecreation,
    timeTableTeacherSubject: cell.timeTableTeacherSubject,
    timeTableSubject: cell.timeTableSubject,
    timeTableElective: cell.timeTableElective,
    classRoom: room ? { roomNumber: room.roomNumber } : null,
    course: routine?.timeTableCourse || null,
    classSectionTermId: routine?.classSectionTermId
      ?? classSectionTerm?.classSectionTermId
      ?? null,
    year: classSection?.year ?? null,
    section: classSection?.section ?? null,
    employeeDetails: teacher?.employeeDetails || null,
  };
}

function dateWiseScheduleIncludes({ sessionId, academicYearId } = {}) {
  const routineWhere = {
    is_publish: true,
    ...(academicYearId != null && { academicYearId: Number(academicYearId) }),
    ...buildScope(model.timeTableRoutineModel),
  };

  return [
    {
      model: model.timeTableCellTeachersDateWiseModel,
      as: 'timeTableCellTeachersDateWise',
      required: true,
      attributes: ['userId', 'teacherType', 'isAttendence'],
      include: [
        {
          model: model.employeeModel,
          as: 'employeeDetails',
          attributes: [
            'userId',
            'employeeId',
            'employeeName',
            'employeeCode',
            'pickColor',
            'department',
            'employmentType',
            'employeePhoto',
            'campusId',
          ],
          required: false,
        },
      ],
    },
    {
      model: model.classRoomModel,
      as: 'classRoom',
      attributes: ['roomNumber'],
      required: false,
    },
    {
      model: model.timeTableCellModel,
      as: 'timeTableCell',
      required: true,
      attributes: [
        'timeTableCellId',
        'timeTableType',
        'day',
        'period',
        'isAttendence',
        'isSameTeacher',
        'timeTableNameId',
        'timeTableCreationId',
        'subjectId',
        'electiveSubjectId',
        'teacherSubjectMappingId',
        'classRoomSectionId',
      ],
      include: [
        {
          model: model.timeTableRoutineModel,
          as: 'timeTableRoutine',
          required: true,
          attributes: ['timeTableRoutineId', 'startingDate', 'endingDate', 'classSectionTermId'],
          where: routineWhere,
          include: [
            {
              model: model.courseModel,
              as: 'timeTableCourse',
              attributes: ['courseId', 'courseName'],
              required: false,
            },
            timeTableRoutineClassSectionInclude({
              sectionRequired: Boolean(sessionId),
              sectionWhere: {
                ...(sessionId && { sessionId: Number(sessionId) }),
              },
              termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
              sectionAttributes: ['year', 'section', 'classSectionsId'],
            }),
          ],
        },
        {
          model: model.timeTableStructurePeriodsModel,
          as: 'timeTablecreation',
          required: true,
          attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
        },
        {
          model: model.teacherSubjectMappingModel,
          as: 'timeTableTeacherSubject',
          attributes: ['teacherSubjectMappingId'],
          required: false,
          include: [
            {
              model: model.subjectModel,
              as: 'employeeSubject',
              attributes: ['subjectId', 'subjectName', 'subjectCode'],
              required: false,
            },
          ],
        },
        {
          model: model.subjectModel,
          as: 'timeTableSubject',
          attributes: ['subjectId', 'subjectName', 'subjectCode'],
          required: false,
        },
        {
          model: model.electiveSubjectModel,
          as: 'timeTableElective',
          attributes: ['electiveSubjectId', 'electiveSubjectName', 'electiveSubjectCode'],
          required: false,
        },
        {
          model: model.classRoomModel,
          as: 'classRoom',
          attributes: ['roomNumber'],
          required: false,
        },
      ],
    },
  ];
}

function withTeacherFilter(includes, userId) {
  const result = [];
  for (const include of includes) {
    if (include.as === 'timeTableCellTeachersDateWise') {
      // Match by userId only — Primary and Secondary both return the class
      result.push({
        ...include,
        where: { userId: Number(userId) },
        required: true,
      });
      continue;
    }
    result.push(include);
  }
  return result;
}

export async function getTodayClassScheduleForEmployee(userId, currentDate, sessionId) {
  const includes = withTeacherFilter(dateWiseScheduleIncludes({ sessionId }), userId);
  const cellInclude = includes.find((item) => item.as === 'timeTableCell');
  cellInclude.include = cellInclude.include.map((nested) => {
    if (nested.as !== 'timeTableRoutine') {
      return nested;
    }
    return {
      ...nested,
      where: {
        ...nested.where,
        ...routineActiveOnDateWhere(currentDate),
      },
    };
  });

  const rows = await model.timeTableCellDateWiseModel.findAll({
    where: { date: currentDate },
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    include: includes,
    order: [['date', 'ASC']],
  });

  const result = [];
  for (const row of rows) {
    result.push(flattenDateWiseScheduleRow(row, userId));
  }
  return result;
}

export async function getPastClassSchedulesForEmployee(
  userId,
  academicYearId,
  currentDate,
  sessionId,
) {
  const rows = await model.timeTableCellDateWiseModel.findAll({
    where: { date: { [Op.lt]: currentDate } },
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    include: withTeacherFilter(
      dateWiseScheduleIncludes({ sessionId, academicYearId }),
      userId,
    ),
    order: [['date', 'DESC']],
  });

  const result = [];
  for (const row of rows) {
    result.push(flattenDateWiseScheduleRow(row, userId));
  }
  return result;
}

export async function getUpcomingClassSchedulesForEmployee(
  userId,
  academicYearId,
  currentDate,
) {
  const rows = await model.timeTableCellDateWiseModel.findAll({
    where: { date: { [Op.gte]: currentDate } },
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId'],
    include: withTeacherFilter(
      dateWiseScheduleIncludes({ academicYearId }),
      userId,
    ),
    order: [['date', 'ASC']],
  });

  const result = [];
  for (const row of rows) {
    result.push(flattenDateWiseScheduleRow(row, userId));
  }
  return result;
}

export async function getUniqueClassSectionSubjectsForEmployee(userId, academicYearId) {
  const employee = await model.employeeModel.findOne({
    where: { userId: Number(userId) },
    attributes: [
      'userId',
      'employeeId',
      'instituteId',
      'employeeName',
      'employeeCode',
      'department',
      'employmentType',
      'pickColor',
      'employeePhoto',
      'campusId',
    ],
  });
  if (!employee) {
    return [];
  }

  const empPlain = employee.get({ plain: true });

  const cells = await model.timeTableCellModel.findAll({
    attributes: [
      'timeTableCellId',
      'day',
      'subjectId',
      'electiveSubjectId',
      'teacherSubjectMappingId',
    ],
    include: [
      {
        model: model.timeTableCellTeachersModel,
        as: 'timeTableCellTeachers',
        required: true,
        where: { userId: Number(userId) },
        attributes: ['userId', 'teacherType'],
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutine',
        required: true,
        where: {
          instituteId: Number(empPlain.instituteId),
          academicYearId: Number(academicYearId),
          ...buildScope(model.timeTableRoutineModel),
        },
        attributes: ['timeTableRoutineId', 'startingDate', 'endingDate', 'classSectionTermId'],
        include: [
          {
            model: model.courseModel,
            as: 'timeTableCourse',
            attributes: ['courseName', 'courseId'],
            required: false,
          },
          timeTableRoutineClassSectionInclude({
            termAttributes: ['classSectionTermId', 'term', 'classSectionsId'],
            sectionAttributes: ['year', 'section', 'classSectionsId'],
          }),
        ],
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        attributes: ['subjectId', 'subjectName'],
        required: false,
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        attributes: ['electiveSubjectId', 'electiveSubjectName'],
        required: false,
      },
    ],
  });

  const schedules = [];
  for (const cell of cells) {
    const plain = cell.get({ plain: true });
    schedules.push({
      ...plain,
      timeTablecreate: plain.timeTableRoutine,
      employeeDetails: empPlain,
    });
  }
  return schedules;
}

export async function countEmployeeDateWiseSchedules(userId, academicYearId, currentDate) {
  const pastCount = await model.timeTableCellDateWiseModel.count({
    where: { date: { [Op.lt]: currentDate } },
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: 'timeTableCellTeachersDateWise',
        required: true,
        where: { userId: Number(userId) },
        attributes: [],
      },
      {
        model: model.timeTableCellModel,
        as: 'timeTableCell',
        required: true,
        attributes: [],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: 'timeTableRoutine',
            required: true,
            attributes: [],
            where: {
              is_publish: true,
              academicYearId: Number(academicYearId),
              ...buildScope(model.timeTableRoutineModel),
            },
          },
        ],
      },
    ],
  });

  const upcomingCount = await model.timeTableCellDateWiseModel.count({
    where: { date: { [Op.gte]: currentDate } },
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: 'timeTableCellTeachersDateWise',
        required: true,
        where: { userId: Number(userId) },
        attributes: [],
      },
      {
        model: model.timeTableCellModel,
        as: 'timeTableCell',
        required: true,
        attributes: [],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: 'timeTableRoutine',
            required: true,
            attributes: [],
            where: {
              is_publish: true,
              academicYearId: Number(academicYearId),
              ...buildScope(model.timeTableRoutineModel),
            },
          },
        ],
      },
    ],
  });

  return { pastCount, upcomingCount };
}

export async function getTeacherWeekCells(userId) {
  return model.timeTableRoutineModel.findAll({
    where: {
      is_publish: true,
      ...buildScope(model.timeTableRoutineModel),
    },
    attributes: {
      exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'],
    },
    include: [
      {
        model: model.courseModel,
        as: 'timeTableCourse',
        attributes: ['courseId', 'courseName'],
        required: false,
      },
      timeTableRoutineClassSectionInclude({
        sectionAttributes: ['section', 'year', 'classSectionsId'],
      }),
      {
        model: model.timeTableCellModel,
        as: 'timeTableCells',
        required: true,
        attributes: [
          'timeTableCellId',
          'day',
          'period',
          'isSameTeacher',
          'timeTableCreationId',
          'timeTableType',
          'subjectId',
          'electiveSubjectId',
          'teacherSubjectMappingId',
        ],
        include: [
          {
            model: model.timeTableCellTeachersModel,
            as: 'timeTableCellTeachers',
            required: true,
            where: { userId: Number(userId) },
            attributes: ['userId', 'teacherType', 'isAttendence'],
            include: [
              {
                model: model.employeeModel,
                as: 'employeeDetails',
                attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
                required: false,
              },
            ],
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
            attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
          },
          {
            model: model.teacherSubjectMappingModel,
            as: 'timeTableTeacherSubject',
            required: false,
            include: [
              {
                model: model.employeeModel,
                as: 'teacherEmployeeData',
                attributes: ['userId', 'employeeId', 'employeeName', 'employeeCode', 'pickColor'],
                required: false,
              },
              {
                model: model.subjectModel,
                as: 'employeeSubject',
                attributes: ['subjectId', 'subjectName', 'subjectCode'],
                required: false,
              },
            ],
          },
          {
            model: model.subjectModel,
            as: 'timeTableSubject',
            attributes: ['subjectId', 'subjectName', 'subjectCode'],
            required: false,
          },
          {
            model: model.electiveSubjectModel,
            as: 'timeTableElective',
            attributes: ['electiveSubjectId', 'electiveSubjectName', 'electiveSubjectCode'],
            required: false,
          },
        ],
      },
    ],
  });
}

export async function getTeacherSubjectsFromWeekCells(userId) {
  const cells = await model.timeTableCellModel.findAll({
    attributes: ['timeTableCellId', 'subjectId', 'electiveSubjectId', 'teacherSubjectMappingId'],
    include: [
      {
        model: model.timeTableCellTeachersModel,
        as: 'timeTableCellTeachers',
        required: true,
        where: { userId: Number(userId) },
        attributes: ['userId'],
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutine',
        required: true,
        where: buildScope(model.timeTableRoutineModel),
        attributes: ['timeTableRoutineId'],
      },
      {
        model: model.subjectModel,
        as: 'timeTableSubject',
        required: false,
        attributes: ['subjectId', 'subjectName', 'subjectCode'],
        include: [
          {
            model: model.courseModel,
            as: 'courseInfo',
            attributes: ['courseId', 'courseName', 'courseCode'],
            required: false,
          },
        ],
      },
      {
        model: model.electiveSubjectModel,
        as: 'timeTableElective',
        required: false,
        attributes: ['electiveSubjectId', 'electiveSubjectName', 'electiveSubjectCode'],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: 'timeTableTeacherSubject',
        required: false,
        include: [
          {
            model: model.subjectModel,
            as: 'employeeSubject',
            required: false,
            attributes: ['subjectId', 'subjectName', 'subjectCode'],
            include: [
              {
                model: model.courseModel,
                as: 'courseInfo',
                attributes: ['courseId', 'courseName', 'courseCode'],
                required: false,
              },
            ],
          },
        ],
      },
    ],
  });

  const coursesMap = new Map();
  const subjectsMap = new Map();

  for (const cell of cells) {
    const item = cell.get({ plain: true });
    let subject = null;
    let course = null;

    if (item.timeTableSubject) {
      subject = {
        subjectId: item.timeTableSubject.subjectId,
        subjectName: item.timeTableSubject.subjectName,
        subjectCode: item.timeTableSubject.subjectCode,
      };
      course = item.timeTableSubject.courseInfo;
    } else if (item.timeTableElective) {
      subject = {
        subjectId: item.timeTableElective.electiveSubjectId,
        subjectName: item.timeTableElective.electiveSubjectName,
        subjectCode: item.timeTableElective.electiveSubjectCode,
      };
    } else if (item.timeTableTeacherSubject && item.timeTableTeacherSubject.employeeSubject) {
      const sub = item.timeTableTeacherSubject.employeeSubject;
      subject = {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
      };
      course = sub.courseInfo;
    }

    if (course && !coursesMap.has(course.courseId)) {
      coursesMap.set(course.courseId, course);
    }
    if (subject && !subjectsMap.has(subject.subjectId)) {
      subjectsMap.set(subject.subjectId, subject);
    }
  }

  const courses = [];
  for (const course of coursesMap.values()) {
    courses.push(course);
  }
  const subjects = [];
  for (const subject of subjectsMap.values()) {
    subjects.push(subject);
  }

  return { courses, subjects };
}

export async function getEmployeeSectionDateWiseRows(classSectionTermId, subjectId, userId) {
  return model.timeTableCellDateWiseModel.findAll({
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date'],
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: 'timeTableCellTeachersDateWise',
        required: true,
        where: { userId: Number(userId) },
        attributes: ['userId', 'teacherType'],
      },
      {
        model: model.timeTableCellModel,
        as: 'timeTableCell',
        required: true,
        where: { subjectId: Number(subjectId) },
        attributes: ['timeTableCellId', 'day', 'period', 'timeTableCreationId', 'subjectId'],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: 'timeTableRoutine',
            required: true,
            attributes: ['timeTableRoutineId', 'startingDate', 'endingDate', 'classSectionTermId'],
            where: {
              classSectionTermId: Number(classSectionTermId),
              ...buildScope(model.timeTableRoutineModel),
            },
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: 'timeTablecreation',
            attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime'],
            required: true,
          },
        ],
      },
    ],
    order: [['date', 'ASC']],
  });
}
