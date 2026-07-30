import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';
import { Op } from 'sequelize';

export async function getCascadingGroupRoutinesRepository({
  academicGroupScopeId,
  academicGroupId,
  sessionId,
}, options = {}) {
  const scopeWhere = buildScope(model.academicGroupScopeModel);
  if (academicGroupScopeId) {
    scopeWhere.academicGroupScopeId = Number(academicGroupScopeId);
  }
  if (sessionId) {
    scopeWhere.sessionId = Number(sessionId);
  }

  const groupWhere = buildScope(model.academicGroupModel);
  if (academicGroupId) {
    groupWhere.academicGroupId = Number(academicGroupId);
  }

  const scopes = await model.academicGroupScopeModel.findAll({
    where: scopeWhere,
    include: [
      {
        model: model.courseModel,
        as: 'course',
        required: false,
        attributes: ['courseId', 'courseName', 'courseCode', 'termType', 'courseDuration'],
      },
      {
        model: model.sessionModel,
        as: 'session',
        required: false,
        attributes: ['sessionId', 'sessionName'],
      },
      {
        model: model.subjectModel,
        as: 'contextSubject',
        required: false,
        attributes: ['subjectId', 'subjectName', 'subjectCode'],
      },
      {
        model: model.timeTableStructureCourseModel,
        as: 'timeTableStructureCourses',
        attributes: ['timetableStructureCourseMapperId', 'timeTableNameId', 'academicGroupScopeId', 'startingDate', 'endingDate'],
        required: false,
        include: [
          {
            model: model.timeTableStructureModel,
            as: 'timeTableStructure',
            attributes: ['timeTableNameId', 'name', 'maximumPeriod', 'periodLength', 'periodGap', 'startingTime', 'weekOff'],
            required: false,
          },
        ],
      },
      {
        model: model.academicGroupModel,
        as: 'groups',
        where: groupWhere,
        required: false,
        include: [
          {
            model: model.timeTableRoutineModel,
            as: 'timeTableRoutines',
            where: buildScope(model.timeTableRoutineModel),
            required: false,
            attributes: ['timeTableRoutineId', 'timetableStructureCourseMapperId', 'academicGroupId', 'courseId', 'academicYearId', 'isPublish', 'campusId', 'timeTableType', 'startingDate', 'endingDate'],
            include: [
              {
                model: model.timeTableCellModel,
                as: 'timeTableCells',
                required: false,
                attributes: [
                  'timeTableCellId',
                  'timeTableRoutineId',
                  'timeTableNameId',
                  'timeTableCreationId',
                  'day',
                  'period',
                  'teacherSubjectMappingId',
                  'classRoomSectionId',
                  'subjectId',
                  'electiveSubjectId',
                  'timeTableType',
                  'isAttendence',
                  'isSameTeacher',
                  'isOverridingSyblingElectives',
                ],
                include: [
                  {
                    model: model.teacherSubjectMappingModel,
                    as: 'timeTableTeacherSubject',
                    required: false,
                    include: [
                      {
                        model: model.subjectModel,
                        as: 'employeeSubject',
                        attributes: ['subjectId', 'subjectName', 'subjectCode'],
                        required: false,
                      },
                      {
                        model: model.employeeModel,
                        as: 'teacherEmployeeData',
                        attributes: ['employeeName', 'employeeCode', 'employeeId'],
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
                    attributes: ['electiveSubjectId', 'electiveSubjectName', 'electiveSubjectCode', 'electiveSubjectType'],
                    required: false,
                  },
                  {
                    model: model.classRoomModel,
                    as: 'classRoom',
                    attributes: ['classRoomSectionId', 'roomNumber'],
                    required: false,
                  },
                  {
                    model: model.timeTableCellTeachersModel,
                    as: 'timeTableCellTeachers',
                    required: false,
                    include: [
                      {
                        model: model.employeeModel,
                        as: 'employeeDetails',
                        attributes: ['employeeId', 'employeeName', 'employeeCode'],
                        required: false,
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    order: [
      ['title', 'ASC'],
      [{ model: model.academicGroupModel, as: 'groups' }, 'groupName', 'ASC'],
    ],
    transaction: options.transaction,
  });

  return scopes;
}

export async function getGroupRoutinesWrappedInStructureRepository({ academicGroupId, sessionId }, options = {}) {
  const groupWhere = buildScope(model.academicGroupModel);
  groupWhere.academicGroupId = Number(academicGroupId);

  const group = await model.academicGroupModel.findOne({
    where: groupWhere,
    include: [
      {
        model: model.academicGroupScopeModel,
        as: 'scope',
        required: false,

        include: [
          {
            model: model.courseModel,
            as: 'course',
            required: false,
            attributes: ['courseId', 'courseName', 'courseCode', 'termType', 'courseDuration'],
          },
          {
            model: model.sessionModel,
            as: 'session',
            required: false,
            attributes: ['sessionId', 'sessionName'],
          },
          {
            model: model.timeTableStructureCourseModel,
            as: 'timeTableStructureCourses',
            required: false,
            include: [
              {
                model: model.timeTableStructureModel,
                as: 'timeTableStructure',
                required: false,
                attributes: ['timeTableNameId', 'name', 'maximumPeriod', 'periodLength', 'periodGap', 'startingTime', 'weekOff'],
                include: [
                  {
                    model: model.timeTableStructurePeriodsModel,
                    as: 'timeTableName',
                    required: false,
                    attributes: { exclude: ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'] },
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        model: model.timeTableRoutineModel,
        as: 'timeTableRoutines',
        where: buildScope(model.timeTableRoutineModel),
        required: false,
        include: [
          {
            model: model.timeTableStructureCourseModel,
            as: 'structureCourseMapping',
            required: false,
            include: [
              {
                model: model.timeTableStructureModel,
                as: 'timeTableStructure',
                required: false,
                attributes: ['timeTableNameId', 'name', 'maximumPeriod', 'periodLength', 'periodGap', 'startingTime', 'weekOff'],
                include: [
                  {
                    model: model.timeTableStructurePeriodsModel,
                    as: 'timeTableName',
                    required: false,
                    attributes: { exclude: ['createdAt', 'updatedAt', 'createdBy', 'updatedBy'] },
                  },
                ],
              },
            ],
          },
          {
            model: model.timeTableCellModel,
            as: 'timeTableCells',
            required: false,
            include: [
              {
                model: model.teacherSubjectMappingModel,
                as: 'timeTableTeacherSubject',
                required: false,
                include: [
                  {
                    model: model.subjectModel,
                    as: 'employeeSubject',
                    attributes: ['subjectId', 'subjectName', 'subjectCode'],
                    required: false,
                  },
                  {
                    model: model.employeeModel,
                    as: 'teacherEmployeeData',
                    attributes: ['employeeName', 'employeeCode', 'employeeId'],
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
                attributes: ['electiveSubjectId', 'electiveSubjectName', 'electiveSubjectCode', 'electiveSubjectType'],
                required: false,
              },
              {
                model: model.classRoomModel,
                as: 'classRoom',
                attributes: ['classRoomSectionId', 'roomNumber'],
                required: false,
              },
              {
                model: model.timeTableCellTeachersModel,
                as: 'timeTableCellTeachers',
                required: false,
                include: [
                  {
                    model: model.employeeModel,
                    as: 'employeeDetails',
                    attributes: ['employeeId', 'employeeName', 'employeeCode'],
                    required: false,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    transaction: options.transaction,
  });

  return group;
}

export async function getSubjectOptionsRepository({ classSectionTermId, academicGroupId }, options = {}) {
  const subjectIds = new Set();
  const directSubjectWheres = [];

  if (classSectionTermId != null) {
    const mapperRows = await scoped(model.subjectMapperModel).findAll({
      where: { classSectionTermId: Number(classSectionTermId) },
      attributes: ['subjectId'],
      raw: true,
      transaction: options.transaction,
    });

    for (const row of mapperRows) {
      if (row.subjectId) {
        subjectIds.add(Number(row.subjectId));
      }
    }

    const termRow = await scoped(model.classSectionTermModel).findOne({
      where: { classSectionTermId: Number(classSectionTermId) },
      attributes: ['classSectionTermId', 'term', 'classSectionsId'],
      include: [
        {
          model: model.classSectionModel,
          as: 'classSection',
          attributes: ['courseId'],
          required: false,
        },
      ],
      transaction: options.transaction,
    });

    if (termRow) {
      const plainTerm = termRow.get ? termRow.get({ plain: true }) : termRow;
      const termVal = plainTerm.term;
      const courseIdVal = plainTerm.classSection?.courseId;

      if (courseIdVal != null && termVal != null) {
        directSubjectWheres.push({
          courseId: Number(courseIdVal),
          term: Number(termVal),
        });
      } else if (courseIdVal != null) {
        directSubjectWheres.push({
          courseId: Number(courseIdVal),
        });
      }
    }
  }

  if (academicGroupId != null) {
    const groupRow = await scoped(model.academicGroupModel).findOne({
      where: { academicGroupId: Number(academicGroupId) },
      attributes: ['academicGroupId', 'academicGroupScopeId'],
      include: [
        {
          model: model.academicGroupScopeModel,
          as: 'scope',
          attributes: ['academicGroupScopeId', 'courseId', 'term', 'contextSubjectId'],
          required: false,
        },
      ],
      transaction: options.transaction,
    });

    if (groupRow) {
      const plainGroup = groupRow.get ? groupRow.get({ plain: true }) : groupRow;
      const scope = plainGroup.scope || plainGroup.academicGroupScope;

      if (scope && scope.courseId != null) {
        const scopeWhere = {
          courseId: Number(scope.courseId),
        };
        if (scope.term != null) {
          scopeWhere.term = Number(scope.term);
        }
        directSubjectWheres.push(scopeWhere);

        if (scope.contextSubjectId != null) {
          subjectIds.add(Number(scope.contextSubjectId));
        }
      }
    }
  }

  const finalSubjectWheres = [];

  if (subjectIds.size > 0) {
    finalSubjectWheres.push({
      subjectId: { [Op.in]: Array.from(subjectIds) },
    });
  }

  for (const w of directSubjectWheres) {
    finalSubjectWheres.push(w);
  }

  if (finalSubjectWheres.length === 0) {
    return [];
  }

  const subjects = await scoped(model.subjectModel).findAll({
    where: {
      [Op.or]: finalSubjectWheres,
    },
    attributes: ['subjectId', 'subjectName'],
    order: [['subjectName', 'ASC']],
    transaction: options.transaction,
  });

  return subjects.map((s) => ({
    subjectId: s.subjectId,
    name: s.subjectName,
  }));
}


