import * as model from "../models/index.js";
import { Op } from "sequelize";
import { scoped } from "../utility/scoped.js";
import { ELIGIBILITY_STATUS } from "../constant.js";

/**
 * Bulk approve students whose current status is REVIEW.
 * Returns number of affected rows.
 */
export async function bulkApproveEligibility(
  examinationSessionId,
  studentIds,
  userId,
  options = {},
) {
  const [affectedCount] = await scoped(
    model.examinationSessionEligibilityModel,
  ).update(
    {
      status: ELIGIBILITY_STATUS.APPROVED,
      approvedBy: userId,
      approvedAt: new Date(),
      updatedBy: userId,
    },
    {
      where: {
        examinationSessionId,
        studentId: { [Op.in]: studentIds },
        status: ELIGIBILITY_STATUS.REVIEW,
      },
      transaction: options.transaction,
    },
  );
  return affectedCount;
}

/**
 * Fetch eligible student IDs (READY or APPROVED) for hall-ticket generation.
 */
export async function getEligibleStudentIdsForGeneration(
  examinationSessionId,
  requestedStudentIds = null,
  options = {},
) {
  const whereClause = {
    examinationSessionId,
    status: {
      [Op.in]: [ELIGIBILITY_STATUS.READY, ELIGIBILITY_STATUS.APPROVED],
    },
  };

  if (requestedStudentIds && requestedStudentIds.length > 0) {
    whereClause.studentId = { [Op.in]: requestedStudentIds };
  }

  const records = await scoped(model.examinationSessionEligibilityModel).findAll({
    where: whereClause,
    attributes: ["studentId"],
    transaction: options.transaction,
    raw: true,
  });

  const ids = [];
  for (const row of records) {
    ids.push(row.studentId);
  }
  return ids;
}

export async function getSingleEligibilityRecord(
  examinationSessionId,
  studentId,
  options = {},
) {
  return scoped(model.examinationSessionEligibilityModel).findOne({
    where: {
      examinationSessionId,
      studentId,
    },
    attributes: [
      "examinationSessionEligibilityId",
      "studentId",
      "examinationSessionId",
      "status",
      "reviewReason",
      "approvedBy",
      "approvedAt",
    ],
    transaction: options.transaction,
  });
}

export async function getEligibilityStatusesMap(
  examinationSessionId,
  options = {},
) {
  const existingRecords = await scoped(
    model.examinationSessionEligibilityModel,
  ).findAll({
    where: { examinationSessionId },
    attributes: ["studentId", "status"],
    transaction: options.transaction,
    raw: true,
  });

  const existingMap = new Map();
  for (const row of existingRecords) {
    existingMap.set(row.studentId, row.status);
  }
  return existingMap;
}

export async function syncEligibilityRecords(
  examinationSessionId,
  studentsData,
  options = {},
) {
  const existingMap = await getEligibilityStatusesMap(
    examinationSessionId,
    options,
  );

  const recordsToCreate = [];
  for (const student of studentsData) {
    if (existingMap.has(student.studentId)) continue;

    const isReady = student.calculatedStatus === "Ready";
    recordsToCreate.push({
      universityId: student.universityId,
      instituteId: student.instituteId,
      academicYearId: student.academicYearId,
      studentId: student.studentId,
      examinationSessionId: Number(examinationSessionId),
      status: isReady ? ELIGIBILITY_STATUS.READY : ELIGIBILITY_STATUS.REVIEW,
      reviewReason: isReady ? null : student.reviewReason,
    });
    existingMap.set(
      student.studentId,
      isReady ? ELIGIBILITY_STATUS.READY : ELIGIBILITY_STATUS.REVIEW,
    );
  }

  if (recordsToCreate.length > 0) {
    await bulkCreateRecords(recordsToCreate, options);
  }

  return existingMap;
}

export async function bulkCreateRecords(records, options = {}) {
  if (!records.length) return [];
  return scoped(model.examinationSessionEligibilityModel).bulkCreate(records, {
    ignoreDuplicates: true,
    transaction: options.transaction,
  });
}
