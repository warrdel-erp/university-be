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
  const cell = plain.timeTableCell || {};
  const dateWiseTeachers = plain.timeTableCellTeachersDateWise || [];
  const weekTeachers = cell.timeTableCellTeachers || [];

  const teachers = dateWiseTeachers.length > 0 ? dateWiseTeachers : weekTeachers;
  let teacher = null;

  if (viewerUserId != null) {
    for (const t of teachers) {
      if (Number(t.userId) === Number(viewerUserId)) {
        teacher = t;
        break;
      }
    }
    if (!teacher && cell.timeTableTeacherSubject && Number(cell.timeTableTeacherSubject.userId) === Number(viewerUserId)) {
      teacher = {
        userId: Number(viewerUserId),
        teacherType: 'Primary',
        isAttendence: true,
        employeeDetails: cell.timeTableTeacherSubject.teacherEmployeeData || null,
      };
    }
  }

  if (!teacher && teachers.length > 0) {
    teacher = teachers[0];
  }

  const room = plain.classRoom || cell.classRoom;
  const routine = cell.timeTableRoutine;
  const classSectionTerm = routine?.timeTableClassSectionTerm;
  const classSection = classSectionTerm?.classSection;

  const subjectId = plain.subjectId || cell.subjectId || null;
  const electiveSubjectId = plain.electiveSubjectId || cell.electiveSubjectId || null;
  const timeTableSubject = plain.timeTableSubject || cell.timeTableSubject || null;
  const timeTableElective = plain.timeTableElective || cell.timeTableElective || null;

  return {
    timeTableCellDateWiseId: plain.timeTableCellDateWiseId,
    timeTableCellId: plain.timeTableCellId,
    date: plain.date,
    timeTableType: cell.timeTableType || 'normal',
    day: cell.day,
    period: cell.period,
    teacherType: teacher ? teacher.teacherType : 'Primary',
    isAttendence: teacher ? (teacher.isAttendence !== false) : true,
    isSameTeacher: cell.isSameTeacher,
    timeTableNameId: cell.timeTableNameId,
    timeTableCreationId: cell.timeTableCreationId,
    timeTablecreate: routine,
    timeTablecreation: cell.timeTablecreation,
    subjectId,
    electiveSubjectId,
    timeTableTeacherSubject: cell.timeTableTeacherSubject,
    timeTableSubject,
    timeTableElective,
    classRoom: room ? { roomNumber: room.roomNumber } : null,
    course: routine?.timeTableCourse || null,
    classSectionTermId: routine?.classSectionTermId
      ?? classSectionTerm?.classSectionTermId
      ?? null,
    year: classSection?.year ?? null,
    section: classSection?.section ?? null,
    employeeDetails: teacher?.employeeDetails || null,
    academicGroupId: routine?.academicGroupId || null,
    academicGroupTitle: routine?.academicGroup?.scope?.title || null,
    academicGroupStudentCount: routine?.academicGroup?.students?.length || 0,
  };
}

function isRowForTeacher(row, userId) {
  if (userId == null) return true;
  const plain = row.get ? row.get({ plain: true }) : row;
  const targetId = Number(userId);

  const dateWiseTeachers = plain.timeTableCellTeachersDateWise || [];
  for (const t of dateWiseTeachers) {
    if (Number(t.userId) === targetId) return true;
  }

  const weekTeachers = plain.timeTableCell?.timeTableCellTeachers || [];
  for (const t of weekTeachers) {
    if (Number(t.userId) === targetId) return true;
  }

  if (plain.timeTableCell?.timeTableTeacherSubject && Number(plain.timeTableCell.timeTableTeacherSubject.userId) === targetId) {
    return true;
  }

  return false;
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
      required: false,
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
            'departmentId',
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
          model: model.timeTableCellTeachersModel,
          as: 'timeTableCellTeachers',
          required: false,
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
                'departmentId',
                'employmentType',
                'employeePhoto',
                'campusId',
              ],
              required: false,
            },
          ],
        },
        {
          model: model.timeTableRoutineModel,
          as: 'timeTableRoutine',
          required: true,
          attributes: ['timeTableRoutineId', 'startingDate', 'endingDate', 'classSectionTermId', 'academicGroupId', 'timetableStructureCourseMapperId'],
          where: routineWhere,
          include: [
            {
              model: model.academicGroupModel,
              as: 'academicGroup',
              attributes: ['academicGroupId', 'groupName'],
              required: false,
              include: [
                {
                  model: model.academicGroupStudentModel,
                  as: 'students',
                  attributes: ['academicGroupStudentId'],
                  required: false,
                },
                {
                  model: model.academicGroupScopeModel,
                  as: 'scope',
                  attributes: ['academicGroupScopeId', 'title'],
                  required: false,
                },
              ]
            },
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
          attributes: ['timeTableCreationId', 'periodName', 'startTime', 'endTime', 'isBreak'],
          where: {
            [Op.or]: [{ isBreak: false }, { isBreak: { [Op.is]: null } }],
          },
        },
        {
          model: model.teacherSubjectMappingModel,
          as: 'timeTableTeacherSubject',
          attributes: ['teacherSubjectMappingId', 'userId'],
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

export async function getTodayClassScheduleForEmployee(userId, currentDate, sessionId) {
  const includes = dateWiseScheduleIncludes({ sessionId });
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
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId', 'subjectId', 'electiveSubjectId'],
    include: includes,
    order: [['date', 'ASC']],
  });

  const result = [];
  for (const row of rows) {
    if (isRowForTeacher(row, userId)) {
      result.push(flattenDateWiseScheduleRow(row, userId));
    }
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
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId', 'subjectId', 'electiveSubjectId'],
    include: dateWiseScheduleIncludes({ sessionId, academicYearId }),
    order: [['date', 'DESC']],
  });

  const result = [];
  for (const row of rows) {
    if (isRowForTeacher(row, userId)) {
      result.push(flattenDateWiseScheduleRow(row, userId));
    }
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
    attributes: ['timeTableCellDateWiseId', 'timeTableCellId', 'date', 'classRoomSectionId', 'subjectId', 'electiveSubjectId'],
    include: dateWiseScheduleIncludes({ academicYearId }),
    order: [['date', 'ASC']],
  });

  const result = [];
  for (const row of rows) {
    if (isRowForTeacher(row, userId)) {
      result.push(flattenDateWiseScheduleRow(row, userId));
    }
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
      'departmentId',
      'employmentType',
      'pickColor',
      'employeePhoto',
      'campusId',
    ],
    include: [
      {
        model: model.departmentModel,
        as: 'employeeDepartment',
        attributes: ['departmentId', 'departmentName'],
        required: false,
      },
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

function nonBreakPeriodInclude() {
  return {
    model: model.timeTableStructurePeriodsModel,
    as: 'timeTablecreation',
    required: true,
    attributes: [],
    where: {
      [Op.or]: [{ isBreak: false }, { isBreak: { [Op.is]: null } }],
    },
  };
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
          nonBreakPeriodInclude(),
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
          nonBreakPeriodInclude(),
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

export async function getTeacherSubjectsFromWeekCells(userId, filters = {}) {
  const { courseId, sessionId } = filters;

  // 1. Fetch direct subject mappings
  const mappingRows = await model.teacherSubjectMappingModel.findAll({
    where: {
      userId: Number(userId),
      ...buildScope(model.teacherSubjectMappingModel),
    },
    include: [{
      model: model.subjectModel,
      as: 'employeeSubject',
      required: true,
      where: {
        ...(courseId != null && { courseId: Number(courseId) }),
        ...buildScope(model.subjectModel),
      },
      include: [{
        model: model.courseModel,
        as: 'courseInfo',
        attributes: ['courseId', 'courseName', 'courseCode'],
        required: false,
      }],
    }],
  });

  // 2. Fetch routine cells
  const routineWhere = {
    ...buildScope(model.timeTableRoutineModel),
    ...(courseId != null && { courseId: Number(courseId) }),
  };

  const termInclude = {
    model: model.classSectionTermModel,
    as: 'classSectionTerm',
    required: sessionId != null,
    include: sessionId != null ? [{
      model: model.classSectionModel,
      as: 'classSection',
      required: true,
      where: { sessionId: Number(sessionId) },
    }] : [],
  };

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
        where: routineWhere,
        attributes: ['timeTableRoutineId'],
        include: [termInclude],
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

  for (const mapping of mappingRows) {
    const item = mapping.get({ plain: true });
    if (item.employeeSubject) {
      const sub = item.employeeSubject;
      const subject = {
        subjectId: sub.subjectId,
        subjectName: sub.subjectName,
        subjectCode: sub.subjectCode,
      };
      const course = sub.courseInfo;

      if (course && !coursesMap.has(course.courseId)) {
        coursesMap.set(course.courseId, course);
      }
      if (subject && !subjectsMap.has(subject.subjectId)) {
        subjectsMap.set(subject.subjectId, subject);
      }
    }
  }

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
