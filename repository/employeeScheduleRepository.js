import { Op, Sequelize } from "sequelize";
import * as model from "../models/index.js";
import { buildScope } from "../utility/scoped.js";
import { timeTableRoutineClassSectionInclude } from "../utility/classSectionIncludes.js";

function routineActiveOnDateWhere(currentDate) {
  return {
    isPublish: true,
    [Op.and]: [
      Sequelize.where(Sequelize.fn("DATE", Sequelize.col("starting_date")), {
        [Op.lte]: currentDate,
      }),
      Sequelize.where(Sequelize.fn("DATE", Sequelize.col("ending_date")), {
        [Op.gte]: currentDate,
      }),
    ],
  };
}

function resolveVariantPeriodTiming(cellDate, routine, baseCreation) {
  if (!baseCreation) return baseCreation;
  const mapping = routine?.structureCourseMapping;
  if (!mapping) return baseCreation;

  const cellDateStr =
    typeof cellDate === "string"
      ? cellDate.slice(0, 10)
      : cellDate instanceof Date
        ? cellDate.toISOString().slice(0, 10)
        : "";

  const variantMappings = mapping.variantCourseMappings || [];

  let matchedVariant = null;
  let matchedPeriods = null;

  if (cellDateStr && variantMappings.length > 0) {
    const matchedVm = variantMappings.find((vm) => {
      const s = vm.startingDate ? String(vm.startingDate).slice(0, 10) : "";
      const e = vm.endingDate ? String(vm.endingDate).slice(0, 10) : "";
      return s && e && cellDateStr >= s && cellDateStr <= e;
    });

    if (matchedVm?.variant) {
      matchedVariant = matchedVm.variant;
      matchedPeriods = matchedVm.variant.variantPeriods || [];
    }
  }

  // Fallback to default variant if no date-range matched
  if (!matchedPeriods || matchedPeriods.length === 0) {
    const defaultVm = variantMappings.find((vm) => vm.variant?.isDefault);
    if (defaultVm?.variant) {
      matchedVariant = defaultVm.variant;
      matchedPeriods = defaultVm.variant.variantPeriods || [];
    } else {
      const structureVariants =
        mapping.timeTableStructure?.structureVariants || [];
      const defaultSv =
        structureVariants.find((sv) => sv.isDefault) || structureVariants[0];
      if (defaultSv) {
        matchedVariant = defaultSv;
        matchedPeriods = defaultSv.variantPeriods || [];
      }
    }
  }

  if (Array.isArray(matchedPeriods) && matchedPeriods.length > 0) {
    const targetPeriodId = Number(baseCreation.timeTableCreationId);
    const vp = matchedPeriods.find(
      (p) => Number(p.timeTableStructurePeriodsId) === targetPeriodId,
    );

    if (vp) {
      return {
        ...baseCreation,
        startTime:
          vp.startTime != null && vp.startTime !== ""
            ? vp.startTime
            : baseCreation.startTime,
        endTime:
          vp.endTime != null && vp.endTime !== ""
            ? vp.endTime
            : baseCreation.endTime,
        isCourse: vp.isCourse ?? baseCreation.isCourse ?? true,
        timeTableStructureVariantId:
          matchedVariant?.timeTableStructureVariantId || null,
        variantName: matchedVariant?.name || null,
      };
    }
  }

  return baseCreation;
}

function flattenDateWiseScheduleRow(row, viewerUserId = null) {
  const plain = row.get ? row.get({ plain: true }) : row;
  const cell = plain.timeTableCell || {};
  const dateWiseTeachers = plain.timeTableCellTeachersDateWise || [];
  const weekTeachers = cell.timeTableCellTeachers || [];

  const teachers =
    dateWiseTeachers.length > 0 ? dateWiseTeachers : weekTeachers;
  let teacher = null;

  if (viewerUserId != null) {
    for (const t of teachers) {
      if (Number(t.userId) === Number(viewerUserId)) {
        teacher = t;
        break;
      }
    }
    if (
      !teacher &&
      cell.timeTableTeacherSubject &&
      Number(cell.timeTableTeacherSubject.userId) === Number(viewerUserId)
    ) {
      teacher = {
        userId: Number(viewerUserId),
        teacherType: "Primary",
        isAttendence: true,
        employeeDetails:
          cell.timeTableTeacherSubject.teacherEmployeeData || null,
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
  const electiveSubjectId =
    plain.electiveSubjectId || cell.electiveSubjectId || null;
  const timeTableSubject =
    plain.timeTableSubject || cell.timeTableSubject || null;
  const timeTableElective =
    plain.timeTableElective || cell.timeTableElective || null;

  const resolvedCreation = resolveVariantPeriodTiming(
    plain.date,
    routine,
    cell.timeTablecreation,
  );

  return {
    timeTableCellDateWiseId: plain.timeTableCellDateWiseId,
    timeTableCellId: plain.timeTableCellId,
    date: plain.date,
    timeTableType: cell.timeTableType || "normal",
    day: cell.day,
    period: cell.period,
    teacherType: teacher ? teacher.teacherType : "Primary",
    isAttendence: teacher ? teacher.isAttendence !== false : true,
    isSameTeacher: cell.isSameTeacher,
    timeTableNameId: cell.timeTableNameId,
    timeTableCreationId: cell.timeTableCreationId,
    timeTablecreate: routine,
    timeTablecreation: resolvedCreation,
    subjectId,
    electiveSubjectId,
    timeTableTeacherSubject: cell.timeTableTeacherSubject,
    timeTableSubject,
    timeTableElective,
    classRoom: room ? { roomNumber: room.roomNumber } : null,
    course: routine?.timeTableCourse || null,
    classSectionTermId:
      routine?.classSectionTermId ??
      classSectionTerm?.classSectionTermId ??
      null,
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

  if (
    plain.timeTableCell?.timeTableTeacherSubject &&
    Number(plain.timeTableCell.timeTableTeacherSubject.userId) === targetId
  ) {
    return true;
  }

  return false;
}

/**
 * Pre-query the cell IDs that belong to a specific teacher.
 * Checks two association paths:
 *   1. time_table_cell_teachers_date_wise.user_id
 *   2. time_table_cell → teacher_subject_mapping.user_id
 */
async function getTeacherCellFilters(userId) {
  const numericUserId = Number(userId);

  const [dateWiseTeacherRows, weekTeacherCells, teacherMappingCells] =
    await Promise.all([
      model.timeTableCellTeachersDateWiseModel.findAll({
        where: { userId: numericUserId },
        attributes: ["timeTableCellDateWiseId"],
        include: [
          {
            model: model.timeTableCellDateWiseModel,
            as: "timeTableCellDateWise",
            required: true,
            attributes: [],
            include: [
              {
                model: model.timeTableCellModel,
                as: "timeTableCell",
                required: true,
                attributes: [],
                include: [
                  {
                    model: model.timeTableRoutineModel,
                    as: "timeTableRoutine",
                    where: {
                      isPublish: true,
                      ...buildScope(model.timeTableRoutineModel),
                    },
                    required: true,
                    attributes: [],
                  },
                ],
              },
            ],
          },
        ],
        raw: true,
      }),
      model.timeTableCellTeachersModel.findAll({
        where: { userId: numericUserId },
        attributes: ["timeTableCellId"],
        include: [
          {
            model: model.timeTableCellModel,
            as: "timeTableCell",
            required: true,
            attributes: [],
            include: [
              {
                model: model.timeTableRoutineModel,
                as: "timeTableRoutine",
                where: {
                  isPublish: true,
                  ...buildScope(model.timeTableRoutineModel),
                },
                required: true,
                attributes: [],
              },
            ],
          },
        ],
        raw: true,
      }),
      model.timeTableCellModel.findAll({
        where: { teacherSubjectMappingId: { [Op.ne]: null } },
        include: [
          {
            model: model.teacherSubjectMappingModel,
            as: "timeTableTeacherSubject",
            where: { userId: numericUserId },
            required: true,
            attributes: [],
          },
          {
            model: model.timeTableRoutineModel,
            as: "timeTableRoutine",
            where: {
              isPublish: true,
              ...buildScope(model.timeTableRoutineModel),
            },
            required: true,
            attributes: [],
          },
        ],
        attributes: ["timeTableCellId"],
        raw: true,
      }),
    ]);

  const cellIdSet = new Set();
  for (const r of weekTeacherCells) {
    if (r.timeTableCellId != null) cellIdSet.add(r.timeTableCellId);
  }
  for (const r of teacherMappingCells) {
    if (r.timeTableCellId != null) cellIdSet.add(r.timeTableCellId);
  }

  return {
    dateWiseIds: dateWiseTeacherRows.map((r) => r.timeTableCellDateWiseId),
    cellIds: Array.from(cellIdSet),
  };
}

function buildTeacherWhereClause(dateWiseIds, cellIds) {
  const orConditions = [];
  if (dateWiseIds.length > 0) {
    orConditions.push({ timeTableCellDateWiseId: { [Op.in]: dateWiseIds } });
  }
  if (cellIds.length > 0) {
    orConditions.push({ timeTableCellId: { [Op.in]: cellIds } });
  }
  if (orConditions.length === 0) return null;
  return orConditions.length === 1 ? orConditions[0] : { [Op.or]: orConditions };
}

function dateWiseScheduleIncludes({ sessionId, academicYearId } = {}) {
  const routineWhere = {
    isPublish: true,
    ...(academicYearId != null && !isNaN(Number(academicYearId)) && { academicYearId: Number(academicYearId) }),
    ...buildScope(model.timeTableRoutineModel),
  };

  return [
    {
      model: model.timeTableCellTeachersDateWiseModel,
      as: "timeTableCellTeachersDateWise",
      required: false,
      attributes: ["userId", "teacherType", "isAttendence"],
      include: [
        {
          model: model.employeeModel,
          as: "employeeDetails",
          attributes: [
            "userId",
            "employeeId",
            "employeeName",
            "employeeCode",
            "pickColor",
            "departmentId",
            "employmentType",
            "employeePhoto",
            "campusId",
          ],
          required: false,
        },
      ],
    },
    {
      model: model.classRoomModel,
      as: "classRoom",
      attributes: ["roomNumber"],
      required: false,
    },
    {
      model: model.subjectModel,
      as: "timeTableSubject",
      attributes: ["subjectId", "subjectName", "subjectCode"],
      required: false,
    },
    {
      model: model.electiveSubjectModel,
      as: "timeTableElective",
      attributes: [
        "electiveSubjectId",
        "electiveSubjectName",
        "electiveSubjectCode",
      ],
      required: false,
    },
    {
      model: model.timeTableCellModel,
      as: "timeTableCell",
      required: true,
      attributes: [
        "timeTableCellId",
        "timeTableType",
        "day",
        "period",
        "isAttendence",
        "isSameTeacher",
        "timeTableNameId",
        "timeTableCreationId",
        "subjectId",
        "electiveSubjectId",
        "teacherSubjectMappingId",
        "classRoomSectionId",
      ],
      include: [
        {
          model: model.timeTableCellTeachersModel,
          as: "timeTableCellTeachers",
          required: false,
          attributes: ["userId", "teacherType", "isAttendence"],
          include: [
            {
              model: model.employeeModel,
              as: "employeeDetails",
              attributes: [
                "userId",
                "employeeId",
                "employeeName",
                "employeeCode",
                "pickColor",
                "departmentId",
                "employmentType",
                "employeePhoto",
                "campusId",
              ],
              required: false,
            },
          ],
        },
        {
          model: model.timeTableRoutineModel,
          as: "timeTableRoutine",
          required: true,
          attributes: [
            "timeTableRoutineId",
            "startingDate",
            "endingDate",
            "classSectionTermId",
            "academicGroupId",
            "timetableStructureCourseMapperId",
          ],
          where: routineWhere,
          include: [
            {
              model: model.academicGroupModel,
              as: "academicGroup",
              attributes: ["academicGroupId", "groupName"],
              required: false,
              include: [
                {
                  model: model.academicGroupStudentModel,
                  as: "students",
                  attributes: ["academicGroupStudentId"],
                  required: false,
                },
                {
                  model: model.academicGroupScopeModel,
                  as: "scope",
                  attributes: ["academicGroupScopeId", "title"],
                  required: false,
                },
              ],
            },
            {
              model: model.courseModel,
              as: "timeTableCourse",
              attributes: ["courseId", "courseName"],
              required: false,
            },
            {
              model: model.timeTableStructureCourseModel,
              as: "structureCourseMapping",
              required: false,
              attributes: [
                "timetableStructureCourseMapperId",
                "timeTableNameId",
                "startingDate",
                "endingDate",
              ],
              include: [
                {
                  model: model.timeTableStructureVariantCourseMappingModel,
                  as: "variantCourseMappings",
                  required: false,
                  attributes: [
                    "id",
                    "timeTableStructureVariantId",
                    "name",
                    "startingDate",
                    "endingDate",
                  ],
                  include: [
                    {
                      model: model.timeTableStructureVariantModel,
                      as: "variant",
                      required: false,
                      attributes: [
                        "timeTableStructureVariantId",
                        "name",
                        "isDefault",
                      ],
                      include: [
                        {
                          model: model.timeTableStructureVariantPeriodsModel,
                          as: "variantPeriods",
                          required: false,
                          attributes: [
                            "id",
                            "timeTableStructurePeriodsId",
                            "startTime",
                            "endTime",
                            "isCourse",
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  model: model.timeTableStructureModel,
                  as: "timeTableStructure",
                  required: false,
                  attributes: ["timeTableNameId", "name"],
                  include: [
                    {
                      model: model.timeTableStructureVariantModel,
                      as: "structureVariants",
                      required: false,
                      attributes: [
                        "timeTableStructureVariantId",
                        "name",
                        "isDefault",
                      ],
                      include: [
                        {
                          model: model.timeTableStructureVariantPeriodsModel,
                          as: "variantPeriods",
                          required: false,
                          attributes: [
                            "id",
                            "timeTableStructurePeriodsId",
                            "startTime",
                            "endTime",
                            "isCourse",
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            timeTableRoutineClassSectionInclude({
              sectionRequired: Boolean(sessionId),
              sectionWhere: {
                ...(sessionId && { sessionId: Number(sessionId) }),
              },
              termAttributes: ["classSectionTermId", "term", "classSectionsId"],
              sectionAttributes: ["year", "section", "classSectionsId"],
            }),
          ],
        },
        {
          model: model.timeTableStructurePeriodsModel,
          as: "timeTablecreation",
          required: true,
          attributes: [
            "timeTableCreationId",
            "periodName",
            "startTime",
            "endTime",
            "isBreak",
          ],
          where: {
            [Op.or]: [{ isBreak: false }, { isBreak: { [Op.is]: null } }],
          },
        },
        {
          model: model.teacherSubjectMappingModel,
          as: "timeTableTeacherSubject",
          attributes: ["teacherSubjectMappingId", "userId"],
          required: false,
          include: [
            {
              model: model.subjectModel,
              as: "employeeSubject",
              attributes: ["subjectId", "subjectName", "subjectCode"],
              required: false,
            },
          ],
        },
        {
          model: model.subjectModel,
          as: "timeTableSubject",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          required: false,
        },
        {
          model: model.electiveSubjectModel,
          as: "timeTableElective",
          attributes: [
            "electiveSubjectId",
            "electiveSubjectName",
            "electiveSubjectCode",
          ],
          required: false,
        },
        {
          model: model.classRoomModel,
          as: "classRoom",
          attributes: ["roomNumber"],
          required: false,
        },
      ],
    },
  ];
}

export async function getTodayClassScheduleForEmployee(
  userId,
  currentDate,
  sessionId,
  pagination = {},
) {
  const { dateWiseIds, cellIds } = await getTeacherCellFilters(userId);
  const teacherWhere = buildTeacherWhereClause(dateWiseIds, cellIds);
  if (!teacherWhere) return { rows: [], total: 0 };

  const includes = dateWiseScheduleIncludes({ sessionId });
  const cellInclude = includes.find((item) => item.as === "timeTableCell");
  cellInclude.include = cellInclude.include.map((nested) => {
    if (nested.as !== "timeTableRoutine") {
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

  const baseWhere = { date: currentDate, ...teacherWhere };
  const { page, limit } = pagination;

  const total = await model.timeTableCellDateWiseModel.count({
    where: baseWhere,
  });
  if (total === 0) return { rows: [], total: 0 };

  const findOptions = {
    where: baseWhere,
    attributes: [
      "timeTableCellDateWiseId",
      "timeTableCellId",
      "date",
      "classRoomSectionId",
      "subjectId",
      "electiveSubjectId",
    ],
    include: includes,
    order: [["date", "ASC"]],
  };
  if (page && limit) {
    const idRows = await model.timeTableCellDateWiseModel.findAll({
      where: baseWhere,
      attributes: ["timeTableCellDateWiseId"],
      order: [["date", "ASC"]],
      limit,
      offset: (page - 1) * limit,
      raw: true,
    });
    if (!idRows.length) return { rows: [], total };
    findOptions.where = {
      timeTableCellDateWiseId: {
        [Op.in]: idRows.map((r) => r.timeTableCellDateWiseId),
      },
    };
  }

  const rows = await model.timeTableCellDateWiseModel.findAll(findOptions);
  const result = rows.map((row) => flattenDateWiseScheduleRow(row, Number(userId)));
  result.sort((a, b) => ((Number(a.period) || 0) - (Number(b.period) || 0)));
  return { rows: result, total };
}

export async function getPastClassSchedulesForEmployee(
  userId,
  academicYearIdOrDate,
  currentDateOrSessionId,
  sessionIdOrPagination,
  paginationArg = {},
  academicYearIdArg,
) {
  let academicYearId;
  let currentDate;
  let sessionId;
  let pagination;

  if (
    typeof academicYearIdOrDate === "string" &&
    (academicYearIdOrDate.includes("-") || isNaN(Number(academicYearIdOrDate)))
  ) {
    // Signature: (userId, currentDate, sessionId, pagination, academicYearId)
    currentDate = academicYearIdOrDate;
    sessionId = currentDateOrSessionId;
    pagination = sessionIdOrPagination || {};
    academicYearId = academicYearIdArg ?? null;
  } else {
    // Signature: (userId, academicYearId, currentDate, sessionId, pagination)
    academicYearId = academicYearIdOrDate ?? null;
    currentDate = currentDateOrSessionId;
    sessionId = sessionIdOrPagination;
    pagination = paginationArg || {};
  }

  const { dateWiseIds, cellIds } = await getTeacherCellFilters(userId);
  const teacherWhere = buildTeacherWhereClause(dateWiseIds, cellIds);
  if (!teacherWhere) return { rows: [], total: 0 };

  const baseWhere = { date: { [Op.lt]: currentDate }, ...teacherWhere };
  const { page, limit } = pagination;

  const total = await model.timeTableCellDateWiseModel.count({
    where: baseWhere,
  });
  if (total === 0) return { rows: [], total: 0 };

  const findOptions = {
    where: baseWhere,
    attributes: [
      "timeTableCellDateWiseId",
      "timeTableCellId",
      "date",
      "classRoomSectionId",
      "subjectId",
      "electiveSubjectId",
    ],
    include: dateWiseScheduleIncludes({ sessionId, academicYearId }),
    order: [["date", "DESC"]],
  };
  if (page && limit) {
    const idRows = await model.timeTableCellDateWiseModel.findAll({
      where: baseWhere,
      attributes: ["timeTableCellDateWiseId"],
      order: [["date", "DESC"]],
      limit,
      offset: (page - 1) * limit,
      raw: true,
    });
    if (!idRows.length) return { rows: [], total };
    findOptions.where = {
      timeTableCellDateWiseId: {
        [Op.in]: idRows.map((r) => r.timeTableCellDateWiseId),
      },
    };
  }

  const rows = await model.timeTableCellDateWiseModel.findAll(findOptions);
  const result = rows.map((row) => flattenDateWiseScheduleRow(row, Number(userId)));
  result.sort((a, b) => (new Date(b.date) - new Date(a.date)) || ((Number(a.period) || 0) - (Number(b.period) || 0)));
  return { rows: result, total };
}

export async function getUpcomingClassSchedulesForEmployee(
  userId,
  academicYearIdOrDate,
  currentDateOrPagination = {},
  paginationArg = {},
) {
  let academicYearId;
  let currentDate;
  let pagination;

  if (
    typeof academicYearIdOrDate === "string" &&
    (academicYearIdOrDate.includes("-") || isNaN(Number(academicYearIdOrDate)))
  ) {
    // Signature: (userId, currentDate, pagination)
    academicYearId = null;
    currentDate = academicYearIdOrDate;
    pagination = currentDateOrPagination || {};
  } else {
    // Signature: (userId, academicYearId, currentDate, pagination)
    academicYearId = academicYearIdOrDate ?? null;
    currentDate = currentDateOrPagination;
    pagination = paginationArg || {};
  }

  const { dateWiseIds, cellIds } = await getTeacherCellFilters(userId);
  const teacherWhere = buildTeacherWhereClause(dateWiseIds, cellIds);
  if (!teacherWhere) return { rows: [], total: 0 };

  const baseWhere = { date: { [Op.gte]: currentDate }, ...teacherWhere };
  const { page, limit } = pagination;

  const total = await model.timeTableCellDateWiseModel.count({
    where: baseWhere,
  });
  if (total === 0) return { rows: [], total: 0 };

  const findOptions = {
    where: baseWhere,
    attributes: [
      "timeTableCellDateWiseId",
      "timeTableCellId",
      "date",
      "classRoomSectionId",
      "subjectId",
      "electiveSubjectId",
    ],
    include: dateWiseScheduleIncludes({ academicYearId }),
    order: [["date", "ASC"]],
  };
  if (page && limit) {
    const idRows = await model.timeTableCellDateWiseModel.findAll({
      where: baseWhere,
      attributes: ["timeTableCellDateWiseId"],
      order: [["date", "ASC"]],
      limit,
      offset: (page - 1) * limit,
      raw: true,
    });
    if (!idRows.length) return { rows: [], total };
    findOptions.where = {
      timeTableCellDateWiseId: {
        [Op.in]: idRows.map((r) => r.timeTableCellDateWiseId),
      },
    };
  }

  const rows = await model.timeTableCellDateWiseModel.findAll(findOptions);
  const result = rows.map((row) => flattenDateWiseScheduleRow(row, Number(userId)));
  result.sort((a, b) => (new Date(a.date) - new Date(b.date)) || ((Number(a.period) || 0) - (Number(b.period) || 0)));
  return { rows: result, total };
}

export async function getUniqueClassSectionSubjectsForEmployee(
  userId,
  academicYearId,
) {
  const employee = await model.employeeModel.findOne({
    where: { userId: Number(userId) },
    attributes: [
      "userId",
      "employeeId",
      "instituteId",
      "employeeName",
      "employeeCode",
      "departmentId",
      "employmentType",
      "pickColor",
      "employeePhoto",
      "campusId",
    ],
    include: [
      {
        model: model.departmentModel,
        as: "employeeDepartment",
        attributes: ["departmentId", "departmentName"],
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
      "timeTableCellId",
      "day",
      "subjectId",
      "electiveSubjectId",
      "teacherSubjectMappingId",
      "timeTableType",
    ],
    include: [
      {
        model: model.timeTableCellTeachersModel,
        as: "timeTableCellTeachers",
        required: true,
        where: { userId: Number(userId) },
        attributes: ["userId", "teacherType"],
      },
      {
        model: model.timeTableRoutineModel,
        as: "timeTableRoutine",
        required: true,
        where: {
          instituteId: Number(empPlain.instituteId),
          isPublish: true,
          ...(academicYearId != null && !isNaN(Number(academicYearId)) && {
            academicYearId: Number(academicYearId),
          }),
          ...buildScope(model.timeTableRoutineModel),
        },
        attributes: [
          "timeTableRoutineId",
          "startingDate",
          "endingDate",
          "classSectionTermId",
          "courseId",
          "timeTableType",
        ],
        include: [
          {
            model: model.courseModel,
            as: "timeTableCourse",
            attributes: ["courseName", "courseId"],
            required: false,
          },
          timeTableRoutineClassSectionInclude({
            termRequired: false,
            sectionRequired: false,
            termAttributes: ["classSectionTermId", "term", "classSectionsId"],
            sectionAttributes: ["year", "section", "classSectionsId"],
          }),
        ],
      },
      {
        model: model.subjectModel,
        as: "timeTableSubject",
        attributes: ["subjectId", "subjectName"],
        required: false,
      },
      {
        model: model.electiveSubjectModel,
        as: "timeTableElective",
        attributes: [
          "electiveSubjectId",
          "electiveSubjectName",
          "electiveSubjectCode",
        ],
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
    as: "timeTablecreation",
    required: true,
    attributes: [],
    where: {
      [Op.or]: [{ isBreak: false }, { isBreak: { [Op.is]: null } }],
    },
  };
}

export async function countEmployeeDateWiseSchedules(
  userId,
  academicYearIdOrDate,
  currentDateArg,
) {
  let academicYearId;
  let currentDate;

  if (
    typeof academicYearIdOrDate === "string" &&
    (academicYearIdOrDate.includes("-") || isNaN(Number(academicYearIdOrDate)))
  ) {
    // Called as: (userId, currentDate)
    academicYearId = null;
    currentDate = academicYearIdOrDate;
  } else {
    // Called as: (userId, academicYearId, currentDate)
    academicYearId =
      academicYearIdOrDate != null && !isNaN(Number(academicYearIdOrDate))
        ? Number(academicYearIdOrDate)
        : null;
    currentDate = currentDateArg;
  }

  const { dateWiseIds, cellIds } = await getTeacherCellFilters(userId);
  const teacherWhere = buildTeacherWhereClause(dateWiseIds, cellIds);
  if (!teacherWhere) return { pastCount: 0, upcomingCount: 0 };

  const routineWhere = {
    isPublish: true,
    ...(academicYearId != null && !isNaN(Number(academicYearId)) && {
      academicYearId: Number(academicYearId),
    }),
    ...buildScope(model.timeTableRoutineModel),
  };

  const baseInclude = [
    {
      model: model.timeTableCellModel,
      as: "timeTableCell",
      required: true,
      attributes: [],
      include: [
        {
          model: model.timeTableRoutineModel,
          as: "timeTableRoutine",
          required: true,
          attributes: [],
          where: routineWhere,
        },
        nonBreakPeriodInclude(),
      ],
    },
  ];

  const pastCount = await model.timeTableCellDateWiseModel.count({
    where: { date: { [Op.lt]: currentDate }, ...teacherWhere },
    include: baseInclude,
    distinct: true,
    col: "time_table_cell_date_wise_id",
  });

  const upcomingCount = await model.timeTableCellDateWiseModel.count({
    where: { date: { [Op.gte]: currentDate }, ...teacherWhere },
    include: baseInclude,
    distinct: true,
    col: "time_table_cell_date_wise_id",
  });

  return { pastCount, upcomingCount };
}

export async function getTeacherWeekCells(userId) {
  return model.timeTableRoutineModel.findAll({
    where: {
      isPublish: true,
      ...buildScope(model.timeTableRoutineModel),
    },
    attributes: {
      exclude: [
        "createdAt",
        "updatedAt",
        "deletedAt",
        "createdBy",
        "updatedBy",
      ],
    },
    include: [
      {
        model: model.courseModel,
        as: "timeTableCourse",
        attributes: ["courseId", "courseName"],
        required: false,
      },
      timeTableRoutineClassSectionInclude({
        sectionAttributes: ["section", "year", "classSectionsId"],
      }),
      {
        model: model.timeTableCellModel,
        as: "timeTableCells",
        required: true,
        attributes: [
          "timeTableCellId",
          "day",
          "period",
          "isSameTeacher",
          "timeTableCreationId",
          "timeTableType",
          "subjectId",
          "electiveSubjectId",
          "teacherSubjectMappingId",
        ],
        include: [
          {
            model: model.timeTableCellTeachersModel,
            as: "timeTableCellTeachers",
            required: true,
            where: { userId: Number(userId) },
            attributes: ["userId", "teacherType", "isAttendence"],
            include: [
              {
                model: model.employeeModel,
                as: "employeeDetails",
                attributes: [
                  "userId",
                  "employeeId",
                  "employeeName",
                  "employeeCode",
                  "pickColor",
                ],
                required: false,
              },
            ],
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTablecreation",
            attributes: [
              "timeTableCreationId",
              "periodName",
              "startTime",
              "endTime",
            ],
          },
          {
            model: model.teacherSubjectMappingModel,
            as: "timeTableTeacherSubject",
            required: false,
            include: [
              {
                model: model.employeeModel,
                as: "teacherEmployeeData",
                attributes: [
                  "userId",
                  "employeeId",
                  "employeeName",
                  "employeeCode",
                  "pickColor",
                ],
                required: false,
              },
              {
                model: model.subjectModel,
                as: "employeeSubject",
                attributes: ["subjectId", "subjectName", "subjectCode"],
                required: false,
              },
            ],
          },
          {
            model: model.subjectModel,
            as: "timeTableSubject",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: false,
          },
          {
            model: model.electiveSubjectModel,
            as: "timeTableElective",
            attributes: [
              "electiveSubjectId",
              "electiveSubjectName",
              "electiveSubjectCode",
            ],
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
    include: [
      {
        model: model.subjectModel,
        as: "employeeSubject",
        required: true,
        where: {
          ...(courseId != null && { courseId: Number(courseId) }),
          ...buildScope(model.subjectModel),
        },
        include: [
          {
            model: model.courseModel,
            as: "courseInfo",
            attributes: ["courseId", "courseName", "courseCode"],
            required: false,
          },
        ],
      },
    ],
  });

  // 2. Fetch routine cells
  const routineWhere = {
    isPublish: true,
    ...buildScope(model.timeTableRoutineModel),
    ...(courseId != null && { courseId: Number(courseId) }),
  };

  const termInclude = {
    model: model.classSectionTermModel,
    as: "timeTableClassSectionTerm",
    required: sessionId != null,
    include:
      sessionId != null
        ? [
            {
              model: model.classSectionModel,
              as: "classSection",
              required: true,
              where: { sessionId: Number(sessionId) },
            },
          ]
        : [],
  };

  const cells = await model.timeTableCellModel.findAll({
    attributes: [
      "timeTableCellId",
      "subjectId",
      "electiveSubjectId",
      "teacherSubjectMappingId",
    ],
    include: [
      {
        model: model.timeTableCellTeachersModel,
        as: "timeTableCellTeachers",
        required: true,
        where: { userId: Number(userId) },
        attributes: ["userId"],
      },
      {
        model: model.timeTableRoutineModel,
        as: "timeTableRoutine",
        required: true,
        where: routineWhere,
        attributes: ["timeTableRoutineId"],
        include: [termInclude],
      },
      {
        model: model.subjectModel,
        as: "timeTableSubject",
        required: false,
        attributes: ["subjectId", "subjectName", "subjectCode"],
        include: [
          {
            model: model.courseModel,
            as: "courseInfo",
            attributes: ["courseId", "courseName", "courseCode"],
            required: false,
          },
        ],
      },
      {
        model: model.electiveSubjectModel,
        as: "timeTableElective",
        required: false,
        attributes: [
          "electiveSubjectId",
          "electiveSubjectName",
          "electiveSubjectCode",
        ],
      },
      {
        model: model.teacherSubjectMappingModel,
        as: "timeTableTeacherSubject",
        required: false,
        include: [
          {
            model: model.subjectModel,
            as: "employeeSubject",
            required: false,
            attributes: ["subjectId", "subjectName", "subjectCode"],
            include: [
              {
                model: model.courseModel,
                as: "courseInfo",
                attributes: ["courseId", "courseName", "courseCode"],
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
    } else if (
      item.timeTableTeacherSubject &&
      item.timeTableTeacherSubject.employeeSubject
    ) {
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

export async function getEmployeeSectionDateWiseRows(
  classSectionTermId,
  subjectId,
  userId,
  options = {},
) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const todayStr = `${year}-${month}-${day}`;

  const dateWhere = {};
  if (options.includeFuture !== true) {
    dateWhere.date = { [Op.lte]: todayStr };
  }

  return model.timeTableCellDateWiseModel.findAll({
    where: dateWhere,
    attributes: ["timeTableCellDateWiseId", "timeTableCellId", "date"],
    include: [
      {
        model: model.timeTableCellTeachersDateWiseModel,
        as: "timeTableCellTeachersDateWise",
        required: true,
        where: { userId: Number(userId) },
        attributes: ["userId", "teacherType"],
      },
      {
        model: model.timeTableCellModel,
        as: "timeTableCell",
        required: true,
        where: { subjectId: Number(subjectId) },
        attributes: [
          "timeTableCellId",
          "day",
          "period",
          "timeTableCreationId",
          "subjectId",
        ],
        include: [
          {
            model: model.timeTableRoutineModel,
            as: "timeTableRoutine",
            required: true,
            attributes: [
              "timeTableRoutineId",
              "startingDate",
              "endingDate",
              "classSectionTermId",
            ],
            where: {
              isPublish: true,
              classSectionTermId: Number(classSectionTermId),
              ...buildScope(model.timeTableRoutineModel),
            },
          },
          {
            model: model.timeTableStructurePeriodsModel,
            as: "timeTablecreation",
            attributes: [
              "timeTableCreationId",
              "periodName",
              "startTime",
              "endTime",
            ],
            required: true,
          },
        ],
      },
    ],
    order: [["date", "ASC"]],
  });
}
