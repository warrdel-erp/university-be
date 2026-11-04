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
        attributes: ['timetableStructureCourseMapperId', 'timeTableNameId', 'academicGroupScopeId'],
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
            attributes: ['timeTableRoutineId', 'timetableStructureCourseMapperId', 'academicGroupId', 'courseId', 'academicYearId', 'isPublish', 'campusId', 'timeTableType'],
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

function formatSubjectComponents(subject, directMapping) {
  const mappings = Array.isArray(subject?.subjectComponentMappings)
    ? subject.subjectComponentMappings
    : [];

  const components = mappings.map((m) => {
    const comp = m.component || {};
    return {
      subjectComponentMappingId: m.id,
      subject_component_mapping_id: m.id,
      id: comp.id ?? m.subjectComponentId,
      componentId: comp.id ?? m.subjectComponentId,
      componentName: comp.componentName ?? null,
      code: comp.code ?? null,
      description: comp.description ?? null,
    };
  });

  if (
    directMapping &&
    !components.some((c) => c.subjectComponentMappingId === directMapping.id)
  ) {
    const comp = directMapping.component || {};
    components.unshift({
      subjectComponentMappingId: directMapping.id,
      subject_component_mapping_id: directMapping.id,
      id: comp.id ?? directMapping.subjectComponentId,
      componentId: comp.id ?? directMapping.subjectComponentId,
      componentName: comp.componentName ?? null,
      code: comp.code ?? null,
      description: comp.description ?? null,
    });
  }

  return components;
}

function buildSubjectTypeWhere(subjectType) {
  if (!subjectType) return {};
  if (Array.isArray(subjectType)) {
    return { subjectType: { [Op.in]: subjectType } };
  }
  if (typeof subjectType === "string") {
    const rawList = subjectType.split(",").map((s) => s.trim()).filter(Boolean);
    if (rawList.length === 0) return {};
    if (rawList.length === 1 && rawList[0].toLowerCase() === "all") {
      return {};
    }
    const canonicalMap = {
      core: "Core",
      elective: "Elective",
      "open elective": "Open Elective",
      openelective: "Open Elective",
      "department elective": "Department Elective",
      departmentelective: "Department Elective",
      foundation: "Foundation",
    };
    const resolved = rawList.map((item) => canonicalMap[item.toLowerCase()] || item);
    if (resolved.length === 1) {
      return { subjectType: resolved[0] };
    }
    return { subjectType: { [Op.in]: resolved } };
  }
  return {};
}

export async function getSubjectOptionsRepository({ classSectionTermId, academicGroupId, subjectType }, options = {}) {
  const subjectTypeWhere = buildSubjectTypeWhere(subjectType);
  if (classSectionTermId) {
    const cst = await model.classSectionTermModel.findByPk(classSectionTermId, {
      include: [{
        model: model.classSectionModel,
        as: 'classSection',
        include: [{
          model: model.sessionModel,
          as: 'classSession',
          include: [{ model: model.acedmicYearModel, as: 'sessionAcedmic' }]
        }]
      }],
      transaction: options.transaction
    });

    if (!cst) return [];

    const term = cst.term;
    const courseId = cst.classSection?.courseId;
    const year = cst.classSection?.year || 1;
    const batchId = cst.classSection?.batchId;

    let batchMapping = null;
    if (batchId) {
      batchMapping = await model.curriculumBatchMappingModel.findOne({
        where: { batchId },
        include: [{
          model: model.curriculumModel,
          as: 'curriculum',
          where: { courseId },
          required: true
        }],
        transaction: options.transaction
      });
    }

    if (!batchMapping) {
      // Academic year title (e.g. '2026-2027') -> 2026
      const ayTitle = cst.classSection?.classSession?.sessionAcedmic?.year_title;
      const startYear = ayTitle ? parseInt(ayTitle.match(/\d{4}/)?.[0], 10) : new Date().getFullYear();
      const batchYear = startYear - (year - 1);

      // Get curriculum mapped for this batch year and program
      batchMapping = await model.curriculumBatchMappingModel.findOne({
        include: [
          {
            model: model.batchModel,
            as: 'batch',
            where: { batch: batchYear },
            required: true
          },
          {
            model: model.curriculumModel,
            as: 'curriculum',
            where: { courseId },
            required: true
          }
        ],
        transaction: options.transaction
      });
    }

    if (batchMapping?.curriculumId) {
      const mappings = await model.curriculumSubjectTermMappingModel.findAll({
        where: { curriculumId: batchMapping.curriculumId, term },
        attributes: [
          'curriculumSubjectTermMappingId',
          'subjectId',
          'subjectComponentMappingId',
          'term',
          'credit',
        ],
        include: [
          {
            model: model.subjectModel,
            as: 'subject',
            attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType', 'subjectCategory'],
            where: {
              isActive: true,
              ...subjectTypeWhere,
            },
            required: true,
            include: [
              {
                model: model.subjectComponentMappingModel,
                as: 'subjectComponentMappings',
                required: false,
                attributes: ['id', 'subjectId', 'subjectComponentId'],
                include: [
                  {
                    model: model.subjectComponentModel,
                    as: 'component',
                    required: false,
                    attributes: ['id', 'componentName', 'code', 'description'],
                  },
                ],
              },
            ],
          },
          {
            model: model.subjectComponentMappingModel,
            as: 'subjectComponentMapping',
            required: false,
            attributes: ['id', 'subjectId', 'subjectComponentId'],
            include: [
              {
                model: model.subjectComponentModel,
                as: 'component',
                required: false,
                attributes: ['id', 'componentName', 'code', 'description'],
              },
            ],
          },
        ],
        order: [[{ model: model.subjectModel, as: 'subject' }, 'subjectName', 'ASC']],
        transaction: options.transaction
      });

      if (mappings.length > 0 || subjectType) {
        return mappings.map((m) => {
          const components = formatSubjectComponents(
            m.subject,
            m.subjectComponentMapping,
          );
          return {
            subjectId: m.subject.subjectId,
            name: m.subject.subjectName,
            subjectName: m.subject.subjectName,
            subjectCode: m.subject.subjectCode,
            subjectType: m.subject.subjectType,
            subjectCategory: m.subject.subjectCategory,
            credit: m.credit,
            curriculumSubjectTermMappingId: m.curriculumSubjectTermMappingId,
            subjectComponentMappingId: m.subjectComponentMappingId ?? (components[0]?.subjectComponentMappingId || null),
            components,
          };
        });
      }
    }

    // Fallback if curriculum mapping not yet set
    const subjects = await model.subjectModel.findAll({
      where: { courseId, term, isActive: true, ...subjectTypeWhere },
      attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType', 'subjectCategory'],
      include: [
        {
          model: model.subjectComponentMappingModel,
          as: 'subjectComponentMappings',
          required: false,
          attributes: ['id', 'subjectId', 'subjectComponentId'],
          include: [
            {
              model: model.subjectComponentModel,
              as: 'component',
              required: false,
              attributes: ['id', 'componentName', 'code', 'description'],
            },
          ],
        },
      ],
      order: [['subjectName', 'ASC']],
      transaction: options.transaction
    });

    return subjects.map((s) => {
      const components = formatSubjectComponents(s);
      return {
        subjectId: s.subjectId,
        name: s.subjectName,
        subjectName: s.subjectName,
        subjectCode: s.subjectCode,
        subjectType: s.subjectType,
        subjectCategory: s.subjectCategory,
        subjectComponentMappingId: components[0]?.subjectComponentMappingId || null,
        components,
      };
    });
  }

  // Academic Group support
  if (academicGroupId) {
    const group = await model.academicGroupModel.findByPk(academicGroupId, {
      include: [{ model: model.academicGroupScopeModel, as: 'scope' }],
      transaction: options.transaction
    });
    const scope = group?.scope;
    if (scope?.courseId && scope?.term) {
      const subjects = await model.subjectModel.findAll({
        where: { courseId: scope.courseId, term: scope.term, isActive: true, ...subjectTypeWhere },
        attributes: ['subjectId', 'subjectName', 'subjectCode', 'subjectType', 'subjectCategory'],
        include: [
          {
            model: model.subjectComponentMappingModel,
            as: 'subjectComponentMappings',
            required: false,
            attributes: ['id', 'subjectId', 'subjectComponentId'],
            include: [
              {
                model: model.subjectComponentModel,
                as: 'component',
                required: false,
                attributes: ['id', 'componentName', 'code', 'description'],
              },
            ],
          },
        ],
        order: [['subjectName', 'ASC']],
        transaction: options.transaction
      });
      return subjects.map((s) => {
        const components = formatSubjectComponents(s);
        return {
          subjectId: s.subjectId,
          name: s.subjectName,
          subjectName: s.subjectName,
          subjectCode: s.subjectCode,
          subjectType: s.subjectType,
          subjectCategory: s.subjectCategory,
          subjectComponentMappingId: components[0]?.subjectComponentMappingId || null,
          components,
        };
      });
    }
  }

  return [];
}


