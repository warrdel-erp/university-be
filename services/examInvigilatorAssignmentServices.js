import * as examInvigilatorAssignmentRepository from "../repository/examInvigilatorAssignmentRepository.js";
import sequelize from "../database/sequelizeConfig.js";

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export async function createAssignment(assignmentData, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    const { userId, examDate, examinationSessionSlotId } = assignmentData;

    const conflict =
      await examInvigilatorAssignmentRepository.checkActiveAssignmentConflict(
        userId,
        examDate,
        examinationSessionSlotId,
        null,
        { ...options, transaction },
      );

    if (conflict) {
      throw createBadRequestError(
        "Invigilator is already assigned to another room during this date and slot.",
      );
    }

    return await examInvigilatorAssignmentRepository.createAssignment(
      assignmentData,
      { ...options, transaction },
    );
  });
}

export async function updateAssignment(id, updateData, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    const assignmentId = Number(id);
    const existing =
      await examInvigilatorAssignmentRepository.getAssignmentById(
        assignmentId,
        { ...options, transaction },
      );

    if (!existing) {
      const error = new Error("Invigilator assignment not found");
      error.statusCode = 404;
      throw error;
    }

    const userId = updateData.userId ?? existing.userId;
    const examDate = updateData.examDate ?? existing.examDate;
    const examinationSessionSlotId =
      updateData.examinationSessionSlotId ?? existing.examinationSessionSlotId;

    const conflict =
      await examInvigilatorAssignmentRepository.checkActiveAssignmentConflict(
        userId,
        examDate,
        examinationSessionSlotId,
        assignmentId,
        { ...options, transaction },
      );

    if (conflict) {
      throw createBadRequestError(
        "Invigilator is already assigned to another room during this date and slot.",
      );
    }

    await examInvigilatorAssignmentRepository.updateAssignment(
      assignmentId,
      updateData,
      { ...options, transaction },
    );

    return await examInvigilatorAssignmentRepository.getAssignmentById(
      assignmentId,
      { ...options, transaction },
    );
  });
}

export async function getAssignmentById(id, options = {}) {
  const record = await examInvigilatorAssignmentRepository.getAssignmentById(
    id,
    options,
  );
  if (!record) {
    const error = new Error("Invigilator assignment not found");
    error.statusCode = 404;
    throw error;
  }
  return record;
}

export async function getAssignments(filters, options = {}) {
  return examInvigilatorAssignmentRepository.getAssignments(
    filters,
    options,
  );
}

export async function deleteAssignment(id, options = {}) {
  return await sequelize.transaction(async (transaction) => {
    const existing =
      await examInvigilatorAssignmentRepository.getAssignmentById(id, {
        ...options,
        transaction,
      });
    if (!existing) {
      const error = new Error("Invigilator assignment not found");
      error.statusCode = 404;
      throw error;
    }
    await examInvigilatorAssignmentRepository.deleteAssignment(id, {
      ...options,
      transaction,
    });
    return { message: "Invigilator assignment deleted successfully" };
  });
}

export async function getListOfRooms(filters, pagination, options = {}) {
  const { examinationSessionId, examinationSessionSlotId } = filters;
  return examInvigilatorAssignmentRepository.getRoomsWithSchedulesAndInvigilators(
    examinationSessionId,
    examinationSessionSlotId,
    pagination,
    options,
  );
}

export async function getInvigilatorSummary(filters, options = {}) {
  const { examinationSessionId, examinationSessionSlotId } = filters;
  return examInvigilatorAssignmentRepository.getInvigilatorSummary(
    examinationSessionId,
    examinationSessionSlotId,
    options,
  );
}

export async function getAssignmentsByUserId(userId, examinationSessionId, options = {}) {
  return examInvigilatorAssignmentRepository.getAssignmentsByUserId(userId, examinationSessionId, options);
}

export async function getAssignmentsByExamScheduleId(examScheduleId, options = {}) {
  return examInvigilatorAssignmentRepository.getAssignmentsByExamScheduleId(examScheduleId, options);
}
