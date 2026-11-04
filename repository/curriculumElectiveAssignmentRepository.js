import { Op, Sequelize } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

/**
 * Find all assignments for a curriculum elective requirement
 */
export async function findAssignmentsByRequirement(curriculumElectiveRequirementId, options = {}) {
  const { transaction, where = {}, includeStudent = true, includeSubject = true } = options;

  const includes = [];
  if (includeStudent) {
    includes.push({
      model: model.studentModel,
      as: "student",
      attributes: [
        "studentId",
        "scholarNumber",
        "enrollNumber",
        "firstName",
        "middleName",
        "lastName",
        "batchId",
        "courseId",
      ],
      required: false,
    });
  }

  if (includeSubject) {
    includes.push({
      model: model.subjectModel,
      as: "subject",
      attributes: ["subjectId", "subjectName", "subjectCode", "subjectType"],
      required: false,
    });
  }

  return scoped(model.curriculumElectiveAssignmentModel).findAll({
    where: {
      curriculumElectiveRequirementId,
      ...where,
    },
    include: includes,
    transaction,
  });
}

/**
 * Find single assignment by requirement and student
 */
export async function findAssignmentByRequirementAndStudent(curriculumElectiveRequirementId, studentId, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveAssignmentModel).findOne({
    where: {
      curriculumElectiveRequirementId,
      studentId,
    },
    include: [
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId", "subjectName", "subjectCode", "subjectType"],
        required: false,
      },
    ],
    transaction,
  });
}

/**
 * Assign or update student to a subject under a requirement (Upsert)
 */
export async function upsertAssignment(data, options = {}) {
  const { transaction } = options;
  const {
    curriculumElectiveRequirementId,
    studentId,
    subjectId,
    assignmentSource = "Direct",
    status = "Assigned",
    universityId,
    instituteId,
    academicYearId,
    userId,
  } = data;

  const existing = await scoped(model.curriculumElectiveAssignmentModel).findOne({
    where: {
      curriculumElectiveRequirementId,
      studentId,
      subjectId,
    },
    paranoid: false,
    transaction,
  });

  if (existing) {
    if (existing.deletedAt) {
      await existing.restore({ transaction });
    }
    await existing.update(
      {
        subjectId,
        assignmentSource,
        status,
        updatedBy: userId,
      },
      { transaction }
    );
    return existing;
  }

  return scoped(model.curriculumElectiveAssignmentModel).create(
    {
      curriculumElectiveRequirementId,
      studentId,
      subjectId,
      assignmentSource,
      status,
      universityId,
      instituteId,
      academicYearId,
      createdBy: userId,
      updatedBy: userId,
    },
    { transaction }
  );
}

/**
 * Unassign student from requirement (Soft delete)
 */
export async function unassignStudent(curriculumElectiveRequirementId, studentId, options = {}) {
  const { transaction } = options;
  const existing = await scoped(model.curriculumElectiveAssignmentModel).findOne({
    where: {
      curriculumElectiveRequirementId,
      studentId,
    },
    transaction,
  });

  if (!existing) {
    return false;
  }

  await existing.destroy({ transaction });
  return true;
}

/**
 * Count assigned students under a requirement
 */
export async function countAssignedStudentsByRequirement(curriculumElectiveRequirementId, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveAssignmentModel).count({
    where: {
      curriculumElectiveRequirementId,
      status: "Assigned",
    },
    transaction,
  });
}

/**
 * Count assigned students under a specific requirement and subject
 */
export async function countAssignmentsByRequirementAndSubject(curriculumElectiveRequirementId, subjectId, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveAssignmentModel).count({
    where: {
      curriculumElectiveRequirementId,
      subjectId,
      status: "Assigned",
    },
    transaction,
  });
}

/**
 * Count total enrolled students across all requirements for a subject (Seat Occupancy)
 */
export async function countTotalSubjectEnrollments(subjectId, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveAssignmentModel).count({
    where: {
      subjectId,
      status: "Assigned",
    },
    transaction,
  });
}

/**
 * Bulk upsert assignments
 */
export async function bulkUpsertAssignments(records, options = {}) {
  const { transaction } = options;
  const results = [];
  for (const record of records) {
    const res = await upsertAssignment(record, { transaction });
    results.push(res);
  }
  return results;
}

/**
 * Bulk unassign students from a requirement
 */
export async function bulkUnassignStudents(curriculumElectiveRequirementId, studentIds, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveAssignmentModel).destroy({
    where: {
      curriculumElectiveRequirementId,
      studentId: { [Op.in]: studentIds },
    },
    transaction,
  });
}

/**
 * Find curriculum elective assignments with extensive filters, search, sorting and pagination
 */
export async function findCurriculumElectiveAssignments(query = {}, options = {}) {
  const { transaction } = options;
  const where = {};

  const requirementId =
    query.curriculumElectiveRequirementId ||
    query.curriculum_elective_requirement_id ||
    query.requirementId ||
    query.id;
  if (requirementId) {
    where.curriculumElectiveRequirementId = parseInt(requirementId, 10);
  }

  const subjectId = query.subjectId || query.subject_id;
  if (subjectId) {
    where.subjectId = parseInt(subjectId, 10);
  }

  const studentId = query.studentId || query.student_id;
  if (studentId) {
    where.studentId = parseInt(studentId, 10);
  }

  if (query.status && String(query.status).toLowerCase() !== "all" && String(query.status).toLowerCase() !== "all statuses") {
    where.status = query.status;
  }

  if (
    query.assignmentSource &&
    String(query.assignmentSource).toLowerCase() !== "all" &&
    String(query.assignmentSource).toLowerCase() !== "all sources"
  ) {
    where.assignmentSource = query.assignmentSource;
  }

  if (query.academicYearId) {
    where.academicYearId = parseInt(query.academicYearId, 10);
  }

  if (query.instituteId) {
    where.instituteId = parseInt(query.instituteId, 10);
  }

  if (query.universityId) {
    where.universityId = parseInt(query.universityId, 10);
  }

  // Student filtering
  const studentWhere = {};
  if (query.batchId) {
    studentWhere.batchId = parseInt(query.batchId, 10);
  }
  if (query.courseId || query.programmeId) {
    studentWhere.courseId = parseInt(query.courseId || query.programmeId, 10);
  }

  const search = query.search || query.studentSearch || query.q;
  if (search && String(search).trim()) {
    const s = `%${String(search).trim()}%`;
    studentWhere[Op.or] = [
      { firstName: { [Op.like]: s } },
      { middleName: { [Op.like]: s } },
      { lastName: { [Op.like]: s } },
      { scholarNumber: { [Op.like]: s } },
      { enrollNumber: { [Op.like]: s } },
    ];
  }

  const hasStudentFilter = Object.keys(studentWhere).length > 0;

  // Class Section filtering
  const sectionWhere = {};
  if (query.section) {
    sectionWhere.section = String(query.section).trim();
  }
  if (query.classSectionsId) {
    sectionWhere.classSectionsId = parseInt(query.classSectionsId, 10);
  }
  const hasSectionFilter = Object.keys(sectionWhere).length > 0;

  // Requirement level filtering (curriculumId, term)
  const reqWhere = {};
  if (query.curriculumId) {
    reqWhere.curriculumId = parseInt(query.curriculumId, 10);
  }
  if (query.term) {
    reqWhere.term = parseInt(query.term, 10);
  }
  const hasReqFilter = Object.keys(reqWhere).length > 0;

  // Pagination
  const limitVal =
    query.limit !== undefined && query.limit !== null && query.limit !== ""
      ? parseInt(query.limit, 10)
      : 10;
  const isAll = limitVal === -1 || String(query.limit).toLowerCase() === "all";
  const limit = isAll ? undefined : (limitVal > 0 ? limitVal : 10);
  const page =
    query.page !== undefined && query.page !== null && query.page !== ""
      ? Math.max(1, parseInt(query.page, 10))
      : 1;
  const offset = isAll ? undefined : (page - 1) * (limit || 10);

  // Sorting
  const sortBy = query.sortBy || "createdAt";
  const sortOrder = String(query.sortOrder || "DESC").toUpperCase() === "ASC" ? "ASC" : "DESC";

  let order = [[sortBy, sortOrder]];
  if (sortBy === "studentName" || sortBy === "name") {
    order = [
      [{ model: model.studentModel, as: "student" }, "firstName", sortOrder],
      [{ model: model.studentModel, as: "student" }, "lastName", sortOrder],
    ];
  } else if (sortBy === "enrolmentNo" || sortBy === "enrollNumber") {
    order = [[{ model: model.studentModel, as: "student" }, "enrollNumber", sortOrder]];
  } else if (sortBy === "scholarNumber") {
    order = [[{ model: model.studentModel, as: "student" }, "scholarNumber", sortOrder]];
  }

  const findOptions = {
    where,
    include: [
      {
        model: model.studentModel,
        as: "student",
        where: hasStudentFilter ? studentWhere : undefined,
        required: hasStudentFilter,
        attributes: [
          "studentId",
          "scholarNumber",
          "enrollNumber",
          "firstName",
          "middleName",
          "lastName",
          "batchId",
          "courseId",
          "classSectionTermId",
        ],
        include: [
          {
            model: model.batchModel,
            as: "batch",
            attributes: ["batchId", "batch"],
            required: false,
          },
          {
            model: model.courseModel,
            as: "course",
            attributes: ["courseId", "courseName", "courseCode"],
            required: false,
          },
          {
            model: model.classSectionTermModel,
            as: "studentClassSectionTerm",
            attributes: ["classSectionTermId", "term", "classSectionsId"],
            required: hasSectionFilter,
            include: [
              {
                model: model.classSectionModel,
                as: "classSection",
                attributes: ["classSectionsId", "section"],
                where: hasSectionFilter ? sectionWhere : undefined,
                required: hasSectionFilter,
              },
            ],
          },
        ],
      },
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId", "subjectName", "subjectCode", "subjectType"],
        required: false,
      },
      {
        model: model.curriculumElectiveRequirementModel,
        as: "curriculumElectiveRequirement",
        where: hasReqFilter ? reqWhere : undefined,
        required: hasReqFilter,
        attributes: [
          "id",
          "curriculumId",
          "requirementCode",
          "requirementName",
          "term",
          "coursesRequired",
          "minCredits",
          "electivePoolId",
        ],
        include: [
          {
            model: model.curriculumCategoryModel,
            as: "curriculumCategory",
            attributes: ["id", "categoryName", "code"],
            required: false,
          },
        ],
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["acedmicYearId", "acedmicYear"],
        required: false,
      },
      {
        model: model.userModel,
        as: "creator",
        attributes: ["userId", "userName"],
        required: false,
      },
    ],
    order,
    distinct: true,
    transaction,
  };

  if (!isAll && limit) {
    findOptions.limit = limit;
    findOptions.offset = offset;
  }

  return scoped(model.curriculumElectiveAssignmentModel).findAndCountAll(findOptions);
}

/**
 * Find single assignment by ID with full relations
 */
export async function findCurriculumElectiveAssignmentById(id, options = {}) {
  const { transaction } = options;
  return scoped(model.curriculumElectiveAssignmentModel).findOne({
    where: { id },
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: [
          "studentId",
          "scholarNumber",
          "enrollNumber",
          "firstName",
          "middleName",
          "lastName",
          "batchId",
          "courseId",
          "classSectionTermId",
        ],
        include: [
          {
            model: model.batchModel,
            as: "batch",
            attributes: ["batchId", "batch"],
            required: false,
          },
          {
            model: model.courseModel,
            as: "course",
            attributes: ["courseId", "courseName", "courseCode"],
            required: false,
          },
          {
            model: model.classSectionTermModel,
            as: "studentClassSectionTerm",
            attributes: ["classSectionTermId", "term", "classSectionsId"],
            include: [
              {
                model: model.classSectionModel,
                as: "classSection",
                attributes: ["classSectionsId", "section"],
              },
            ],
          },
        ],
      },
      {
        model: model.subjectModel,
        as: "subject",
        attributes: ["subjectId", "subjectName", "subjectCode", "subjectType"],
      },
      {
        model: model.curriculumElectiveRequirementModel,
        as: "curriculumElectiveRequirement",
        attributes: [
          "id",
          "curriculumId",
          "requirementCode",
          "requirementName",
          "term",
          "coursesRequired",
          "minCredits",
          "electivePoolId",
        ],
        include: [
          {
            model: model.curriculumCategoryModel,
            as: "curriculumCategory",
            attributes: ["id", "categoryName", "code"],
          },
        ],
      },
      {
        model: model.acedmicYearModel,
        as: "academicYear",
        attributes: ["acedmicYearId", "acedmicYear"],
      },
      {
        model: model.userModel,
        as: "creator",
        attributes: ["userId", "userName"],
        required: false,
      },
    ],
    transaction,
  });
}

/**
 * Update an existing assignment record
 */
export async function updateAssignment(id, updateData, options = {}) {
  const { transaction } = options;
  const assignment = await scoped(model.curriculumElectiveAssignmentModel).findByPk(id, { transaction });
  if (!assignment) {
    return null;
  }
  return assignment.update(updateData, { transaction });
}

/**
 * Delete assignment by primary key (soft delete)
 */
export async function deleteAssignmentById(id, options = {}) {
  const { transaction } = options;
  const assignment = await scoped(model.curriculumElectiveAssignmentModel).findByPk(id, { transaction });
  if (!assignment) {
    return false;
  }
  await assignment.destroy({ transaction });
  return true;
}



