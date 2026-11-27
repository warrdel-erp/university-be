import sequelize from "../database/sequelizeConfig.js";
import * as gradingSchemaRepo from "../repository/gradingSchemaRepository.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

export async function createGradingSchema(payload, user) {
  const universityId = user?.universityId || payload.universityId;
  if (!universityId) {
    const error = new Error("University ID is required");
    error.statusCode = 400;
    throw error;
  }

  const existingCode = await gradingSchemaRepo.findGradingSchemaByCode(payload.gradingCode, universityId);
  if (existingCode) {
    const error = new Error(`Grading schema with code '${payload.gradingCode}' already exists`);
    error.statusCode = 400;
    throw error;
  }

  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_CREATE, async ({ transaction: t }) => {
    const gradingData = {
      universityId: Number(universityId),
      gradingName: payload.gradingName,
      gradingCode: payload.gradingCode,
      gradingMethod: payload.gradingMethod,
      distributionMethod: payload.distributionMethod || null,
      relativeConfig: payload.relativeConfig || null,
      maximumMarks: payload.maximumMarks !== undefined ? payload.maximumMarks : null,
      minimumPassingMarks: payload.minimumPassingMarks !== undefined ? payload.minimumPassingMarks : null,
      description: payload.description || null,
      status: payload.status || "DRAFT",
      isActive: payload.isActive !== undefined ? payload.isActive : true,
      createdBy: user?.userId || null,
      updatedBy: user?.userId || null,
    };

    const createdGrading = await gradingSchemaRepo.createGradingSchema(gradingData, { transaction: t });

    if (Array.isArray(payload.grades) && payload.grades.length > 0) {
      for (const gradeItem of payload.grades) {
        await gradingSchemaRepo.createGradingSchemaGrade(createdGrading.gradingId, gradeItem, { transaction: t });
      }
    }

    return createdGrading;
  });
}

export async function getGradingSchemas(filters) {
  return await gradingSchemaRepo.getGradingSchemas(filters);
}

export async function getGradingSchemaById(gradingSchemaId) {
  const schema = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!schema) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return schema;
}

export async function updateGradingSchema(gradingSchemaId, payload, user) {
  const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!existing) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }

  const isMapped = existing.get("isMapped") ?? await gradingSchemaRepo.isGradingSchemaMappedToAcademicRegulation(gradingSchemaId, existing.universityId);
  if (isMapped) {
    const error = new Error("Cannot edit grading schema as it is mapped to an academic regulation");
    error.statusCode = 400;
    throw error;
  }

  const universityId = user?.universityId || existing.universityId;

  if (payload.gradingCode && payload.gradingCode !== existing.gradingCode) {
    const codeConflict = await gradingSchemaRepo.findGradingSchemaByCode(payload.gradingCode, universityId, gradingSchemaId);
    if (codeConflict) {
      const error = new Error(`Grading schema with code '${payload.gradingCode}' already exists`);
      error.statusCode = 400;
      throw error;
    }
  }

  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_UPDATE, async ({ transaction: t }) => {
    const updateData = {
      updatedBy: user?.userId || null,
    };

    if (payload.gradingName !== undefined) updateData.gradingName = payload.gradingName;
    if (payload.gradingCode !== undefined) updateData.gradingCode = payload.gradingCode;
    if (payload.gradingMethod !== undefined) {
      updateData.gradingMethod = payload.gradingMethod;
      if (payload.gradingMethod === "ABSOLUTE" && payload.distributionMethod === undefined) {
        updateData.distributionMethod = null;
        updateData.relativeConfig = null;
      }
    }
    if (payload.distributionMethod !== undefined) updateData.distributionMethod = payload.distributionMethod || null;
    if (payload.relativeConfig !== undefined) updateData.relativeConfig = payload.relativeConfig || null;
    if (payload.maximumMarks !== undefined) {
      updateData.maximumMarks = payload.maximumMarks !== null && payload.maximumMarks !== "" ? payload.maximumMarks : null;
    }
    if (payload.minimumPassingMarks !== undefined) {
      updateData.minimumPassingMarks = payload.minimumPassingMarks !== null && payload.minimumPassingMarks !== "" ? payload.minimumPassingMarks : null;
    }
    if (payload.description !== undefined) updateData.description = payload.description || null;
    if (payload.status !== undefined) updateData.status = payload.status;
    if (payload.isActive !== undefined) updateData.isActive = payload.isActive;

    await gradingSchemaRepo.updateGradingSchema(gradingSchemaId, updateData, { transaction: t });

    if (Array.isArray(payload.grades)) {
      await gradingSchemaRepo.syncGradingSchemaGrades(gradingSchemaId, payload.grades, { transaction: t });
    }

    return await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId, { transaction: t });
  });
}

export async function deleteGradingSchema(gradingSchemaId) {
  const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!existing) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }

  const isMapped = existing.get("isMapped") ?? await gradingSchemaRepo.isGradingSchemaMappedToAcademicRegulation(gradingSchemaId, existing.universityId);
  if (isMapped) {
    const error = new Error("Cannot delete grading schema as it is mapped to an academic regulation");
    error.statusCode = 400;
    throw error;
  }

  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_DELETE, async ({ transaction: t }) => {
    await gradingSchemaRepo.deleteGradingSchema(gradingSchemaId, { transaction: t });
    return { message: "Grading schema deleted successfully" };
  });
}

export async function createGradingSchemaGrade(gradingSchemaId, payload) {
  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_GRADE_CREATE, async ({ transaction }) => {
    const schema = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId, { transaction });
    if (!schema) {
      const error = new Error("Grading schema not found");
      error.statusCode = 404;
      throw error;
    }

    const isMapped = schema.get("isMapped") ?? await gradingSchemaRepo.isGradingSchemaMappedToAcademicRegulation(gradingSchemaId, schema.universityId);
    if (isMapped) {
      const error = new Error("Cannot add grades to grading schema as it is mapped to an academic regulation");
      error.statusCode = 400;
      throw error;
    }

    return await gradingSchemaRepo.createGradingSchemaGrade(gradingSchemaId, payload, { transaction });
  });
}

export async function getGradingSchemaGrades(gradingSchemaId) {
  const schema = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId);
  if (!schema) {
    const error = new Error("Grading schema not found");
    error.statusCode = 404;
    throw error;
  }
  return await gradingSchemaRepo.getGradingSchemaGrades(gradingSchemaId);
}

export async function getGradingSchemaGradeById(gradingSchemaGradeId) {
  const grade = await gradingSchemaRepo.getGradingSchemaGradeById(gradingSchemaGradeId);
  if (!grade) {
    const error = new Error("Grading schema grade not found");
    error.statusCode = 404;
    throw error;
  }
  return grade;
}

export async function updateGradingSchemaGrade(gradingSchemaGradeId, payload) {
  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_GRADE_UPDATE, async ({ transaction }) => {
    const grade = await gradingSchemaRepo.getGradingSchemaGradeById(gradingSchemaGradeId, { transaction });
    if (!grade) {
      const error = new Error("Grading schema grade not found");
      error.statusCode = 404;
      throw error;
    }
    const isMapped = await gradingSchemaRepo.isGradingSchemaMappedToAcademicRegulation(grade.gradingId);
    if (isMapped) {
      const error = new Error("Cannot edit grade as the grading schema is mapped to an academic regulation");
      error.statusCode = 400;
      throw error;
    }

    return await gradingSchemaRepo.updateGradingSchemaGrade(gradingSchemaGradeId, payload, { transaction });
  });
}

export async function deleteGradingSchemaGrade(gradingSchemaGradeId) {
  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_GRADE_DELETE, async ({ transaction }) => {
    const grade = await gradingSchemaRepo.getGradingSchemaGradeById(gradingSchemaGradeId, { transaction });
    if (!grade) {
      const error = new Error("Grading schema grade not found");
      error.statusCode = 404;
      throw error;
    }
    const isMapped = await gradingSchemaRepo.isGradingSchemaMappedToAcademicRegulation(grade.gradingId);
    if (isMapped) {
      const error = new Error("Cannot delete grade as the grading schema is mapped to an academic regulation");
      error.statusCode = 400;
      throw error;
    }

    await gradingSchemaRepo.deleteGradingSchemaGrade(gradingSchemaGradeId, { transaction });
    return { message: "Grade deleted successfully" };
  });
}

export async function publishGradingSchema(gradingSchemaId, user) {
  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_PUBLISH, async ({ transaction }) => {
    const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId, { transaction });
    if (!existing) {
      const error = new Error("Grading schema not found");
      error.statusCode = 404;
      throw error;
    }
    return await gradingSchemaRepo.updateGradingSchemaStatus(gradingSchemaId, "PUBLISHED", user?.userId || null, { transaction });
  });
}

export async function saveGradingSchemaDraft(gradingSchemaId, user) {
  return withAuditEvent(AUDIT_EVENTS.GRADING_SCHEMA_DRAFT, async ({ transaction }) => {
    const existing = await gradingSchemaRepo.getGradingSchemaById(gradingSchemaId, { transaction });
    if (!existing) {
      const error = new Error("Grading schema not found");
      error.statusCode = 404;
      throw error;
    }

    const isMapped = existing.get("isMapped") ?? await gradingSchemaRepo.isGradingSchemaMappedToAcademicRegulation(gradingSchemaId, existing.universityId);
    if (isMapped) {
      const error = new Error("Cannot change grading schema status to draft as it is mapped to an academic regulation");
      error.statusCode = 400;
      throw error;
    }

    return await gradingSchemaRepo.updateGradingSchemaStatus(gradingSchemaId, "DRAFT", user?.userId || null, { transaction });
  });
}

