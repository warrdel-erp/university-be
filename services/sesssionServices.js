import * as sessionCreationService from "../repository/sessionRepository.js";
import { assertCourseIsActive } from "../repository/courseRepository.js";
import sequelize from "../database/sequelizeConfig.js";
import { withAuditEvent } from "../utility/audit/withAuditEvent.js";
import { AUDIT_EVENTS } from "../const/auditEvents.js";

function mapUniqueConstraintError(error) {
  if (error?.name === "SequelizeUniqueConstraintError") {
    throw new Error("This course is already mapped to the selected session.");
  }
  throw error;
}

export async function addSession(sessionData, createdBy, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.SESSION_CREATE, async ({ transaction }) => {
    try {
      return await sessionCreationService.createSessionWithCourseMappings(
        sessionData,
        createdBy,
        updatedBy,
        { transaction }
      );
    } catch (error) {
      mapUniqueConstraintError(error);
    }
  });
}

export async function getSessionDetails(courseId) {
  return await sessionCreationService.getSessionDetails(courseId);
}

export async function getSingleSessionDetails(sessionId) {
  return await sessionCreationService.getSingleSessionDetails(sessionId);
}

export async function updateSession(sessionId, sessionData, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.SESSION_UPDATE, async ({ transaction }) => {
    try {
      return await sessionCreationService.updateSessionWithCourseMappings(
        sessionId,
        sessionData,
        updatedBy,
        { transaction }
      );
    } catch (error) {
      mapUniqueConstraintError(error);
    }
  });
}

export async function deleteSession(sessionId) {
  return withAuditEvent(AUDIT_EVENTS.SESSION_DELETE, async ({ transaction }) => {
    const numericSessionId = Number(sessionId);
    if (!numericSessionId || isNaN(numericSessionId)) {
      throw new Error("Valid sessionId is required");
    }

    // 1. Check if any batches exist under this session
    const [batches] = await sequelize.query(
      "SELECT batch_id FROM batch WHERE session_id = ? LIMIT 1",
      { replacements: [numericSessionId], transaction }
    );
    if (batches && batches.length > 0) {
      throw new Error("Cannot delete session: Batches have already been created under this session.");
    }

    // 2. Check if any students are enrolled under this session
    const [students] = await sequelize.query(
      "SELECT student_id FROM students WHERE session_id = ? AND deleted_at IS NULL LIMIT 1",
      { replacements: [numericSessionId], transaction }
    );
    if (students && students.length > 0) {
      throw new Error("Cannot delete session: Students are enrolled under this session.");
    }

    // 3. Check if any examination sessions are linked to this session
    const [exams] = await sequelize.query(
      "SELECT examination_session_term_id FROM examination_session_term WHERE session_id = ? LIMIT 1",
      { replacements: [numericSessionId], transaction }
    );
    if (exams && exams.length > 0) {
      throw new Error("Cannot delete session: Examination sessions are linked to this session.");
    }

    // Clean up course mapping and delete session
    await sequelize.query(
      "DELETE FROM session_course_mapping WHERE session_id = ?",
      { replacements: [numericSessionId], transaction }
    );

    return await sessionCreationService.deleteSession(numericSessionId, { transaction });
  });
}

export async function couseSessionMapping(data, createdBy, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.SESSION_COURSE_MAP, async ({ transaction }) => {
    try {
      const sessionId = Number(data.sessionId);

      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        throw new Error("sessionId is required");
      }

      const session = await sessionCreationService.assertSessionInScope(sessionId);

      if (!session) {
        throw new Error(`Session ID ${sessionId} not found`);
      }

      await sessionCreationService.syncCourseSessionMappings({
        sessionId,
        courseIds: data.courseId,
        userId: createdBy,
        transaction,
        rejectExisting: true,
      });

      return { success: true, message: "Course mappings created successfully." };
    } catch (error) {
      mapUniqueConstraintError(error);
    }
  });
}

export async function deleteCouseSessionMapping(sessionCourseMappingId) {
  return withAuditEvent(AUDIT_EVENTS.SESSION_COURSE_UNMAP, async ({ transaction }) => {
    const mapping = await sessionCreationService.getMappingById(sessionCourseMappingId);

    if (!mapping) {
      throw new Error("Mapping not found");
    }

    const blocker = await sessionCreationService.getCourseSessionMappingBlocker({
      courseId: mapping.courseId,
      sessionId: mapping.sessionId,
      sessionCourseMappingId,
    });

    if (blocker) {
      throw new Error(blocker);
    }

    return await sessionCreationService.deleteCourseSessionMapping(sessionCourseMappingId, { transaction });
  });
}

export async function updateCouseSessionMapping(data, updatedBy) {
  return withAuditEvent(AUDIT_EVENTS.SESSION_COURSE_MAPPING_UPDATE, async ({ transaction }) => {
    const sessionCourseMappingId = Number(data?.sessionCourseMappingId);

    if (!Number.isInteger(sessionCourseMappingId) || sessionCourseMappingId <= 0) {
      throw new Error("sessionCourseMappingId is required");
    }

    const mapping = await sessionCreationService.getMappingById(sessionCourseMappingId);

    if (!mapping) {
      throw new Error("Mapping not found");
    }

    const payload = { updatedBy };

    if (data.sessionId != null && data.sessionId !== "") {
      const sessionId = Number(data.sessionId);

      if (!Number.isInteger(sessionId) || sessionId <= 0) {
        throw new Error("sessionId must be a positive integer");
      }

      const session = await sessionCreationService.assertSessionInScope(sessionId);

      if (!session) {
        throw new Error(`Session ID ${sessionId} not found`);
      }

      const existingMapping = await sessionCreationService.getMappingByCourseAndSession(
        mapping.courseId,
        sessionId,
      );

      if (
        existingMapping &&
        existingMapping.sessionCourseMappingId !== sessionCourseMappingId
      ) {
        throw new Error(
          `Course ID ${mapping.courseId} is already mapped to Session ID ${sessionId}`,
        );
      }

      payload.sessionId = sessionId;
    }

    if (data.courseId != null && data.courseId !== "") {
      const courseId = Number(data.courseId);

      if (!Number.isInteger(courseId) || courseId <= 0) {
        throw new Error("courseId must be a positive integer");
      }

      const course = await sessionCreationService.assertCourseInScope(courseId);

      if (!course) {
        throw new Error(`Course ID ${courseId} not found`);
      }

      await assertCourseIsActive(courseId, 'be mapped to a new session');

      const targetSessionId = payload.sessionId ?? mapping.sessionId;

      const existingMapping = await sessionCreationService.getMappingByCourseAndSession(
        courseId,
        targetSessionId,
      );

      if (
        existingMapping &&
        existingMapping.sessionCourseMappingId !== sessionCourseMappingId
      ) {
        throw new Error(
          `Course ID ${courseId} is already mapped to Session ID ${targetSessionId}`,
        );
      }

      payload.courseId = courseId;
    }

    return sessionCreationService.updateCouseSessionMapping(sessionCourseMappingId, payload, { transaction });
  });
}

export async function getSessionBatches(sessionId) {
    const [rows] = await sequelize.query("SELECT * FROM batch WHERE session_id = ? ORDER BY batch DESC", { replacements: [Number(sessionId)] });
    return rows;
}

export async function addSessionBatch(data, userId) {
    return withAuditEvent(AUDIT_EVENTS.SESSION_BATCH_MAP, async ({ transaction }) => {
        const { sessionId, batch } = data;
        
        const [existing] = await sequelize.query("SELECT * FROM batch WHERE session_id = ? AND batch = ?", { replacements: [Number(sessionId), Number(batch)], transaction });
        if (existing.length > 0) throw new Error("Batch already mapped to this session");

        const [result] = await sequelize.query(
            "INSERT INTO batch (session_id, batch, created_by, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
            { replacements: [Number(sessionId), Number(batch), userId], transaction }
        );
        return { batch_id: result, session_id: sessionId, batch };
    });
}

export async function deleteSessionBatch(mappingId) {
    return withAuditEvent(AUDIT_EVENTS.SESSION_BATCH_UNMAP, async ({ transaction }) => {
        // Check if it has class sections first
        const [sections] = await sequelize.query("SELECT class_sections_id FROM class_sections WHERE batch_id = ? AND deleted_at IS NULL LIMIT 1", { replacements: [Number(mappingId)], transaction });
        if (sections.length > 0) throw new Error("Cannot delete batch because it has active class sections. Delete the sections first.");
        
        await sequelize.query("DELETE FROM batch WHERE batch_id = ?", { replacements: [Number(mappingId)], transaction });
    });
}
