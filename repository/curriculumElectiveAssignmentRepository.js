import { Op } from "sequelize";
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
    remarks,
    universityId,
    instituteId,
    academicYearId,
    userId,
  } = data;

  const existing = await scoped(model.curriculumElectiveAssignmentModel).findOne({
    where: {
      curriculumElectiveRequirementId,
      studentId,
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
        remarks: remarks !== undefined ? remarks : existing.remarks,
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
      remarks,
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
