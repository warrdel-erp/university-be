import * as teacherExamAssignmentRepository from "../repository/teacherExamAssignmentRepository.js";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

async function resolveEmployeeIdFromUserId(userId) {
  const employee = await scoped(model.employeeModel).findOne({
    where: { userId: Number(userId) },
    attributes: ["employeeId", "userId"],
  });
  if (!employee) {
    const error = new Error("Employee not found for the given userId");
    error.statusCode = 404;
    throw error;
  }
  return Number(employee.employeeId);
}

export async function assignExam(data) {
  const employeeId = await resolveEmployeeIdFromUserId(data.userId);

  const schedule = await scoped(model.examScheduleModel).findByPk(data.examScheduleId, {
    attributes: ["examScheduleId", "examinationSessionId"],
  });

  if (!schedule) {
    const error = new Error("Exam schedule not found.");
    error.statusCode = 404;
    throw error;
  }

  if (schedule.examinationSessionId) {
    const session = await scoped(model.examinationSessionModel).findByPk(schedule.examinationSessionId, {
      attributes: ["status"],
    });

    if (!session || session.status !== "Published") {
      const error = new Error("Examination session must be published before assigning teachers.");
      error.statusCode = 400;
      throw error;
    }
  }

  const existing = await teacherExamAssignmentRepository.findAssignment({
    examScheduleId: data.examScheduleId,
    employeeId,
  });
  if (existing) {
    const error = new Error("This teacher is already assigned to the selected exam schedule.");
    error.statusCode = 409;
    throw error;
  }

  return await teacherExamAssignmentRepository.assignExam({
    examScheduleId: data.examScheduleId,
    employeeId,
    deadline: data.deadline,
    createdBy: data.createdBy,
    updatedBy: data.updatedBy,
  });
}

export async function getAssignments(filters) {
  const whereClause = {
    ...(filters.examScheduleId && { examScheduleId: filters.examScheduleId }),
  };

  if (filters.userId) {
    const employee = await scoped(model.employeeModel).findOne({
      where: { userId: Number(filters.userId) },
      attributes: ["employeeId"],
    });
    if (!employee) {
      return [];
    }
    whereClause.employeeId = Number(employee.employeeId);
  }

  const results = await teacherExamAssignmentRepository.getAssignments(whereClause);
  return results.map((row) => {
    const plain = row.toJSON ? row.toJSON() : row;
    const sched = plain.examSchedule || {};
    return {
      ...plain,
      duration: sched.duration != null ? Number(sched.duration) : null,
      maximumMarks: sched.maximumMarks != null ? Number(sched.maximumMarks) : null,
    };
  });
}

export async function deleteAssignment(teacherExamAssignmentId) {
  return await teacherExamAssignmentRepository.deleteAssignment(teacherExamAssignmentId);
}
