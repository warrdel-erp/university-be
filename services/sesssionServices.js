import sequelize from '../database/sequelizeConfig.js';
import * as sessionCreationService from "../repository/sessionRepository.js";

export async function addSession(sessionData, createdBy, updatedBy) {
  const transaction = await sequelize.transaction();

  try {
    sessionData.createdBy = createdBy;
    sessionData.updatedBy = updatedBy;

    const session = await sessionCreationService.addSession(sessionData, transaction);

    if (Array.isArray(sessionData.courseId) && sessionData.courseId.length > 0) {
      const mappingData = sessionData.courseId.map(courseId => ({
        courseId,
        sessionId: session.sessionId,
        createdBy,
        updatedBy
      }));

      await sessionCreationService.courseSectionMapping(mappingData, transaction);
    }

    await transaction.commit();
    return session;

  } catch (error) {
    await transaction.rollback();
    console.error("Error creating session and mapping:", error);
    throw error;
  }
}

export async function getSessionDetails() {
  return await sessionCreationService.getSessionDetails();
}

export async function getSingleSessionDetails(sessionId) {
  return await sessionCreationService.getSingleSessionDetails(sessionId);
}

export async function updateSession(sessionId, sessionData, updatedBy) {
  sessionData.updatedBy = updatedBy;
  return await sessionCreationService.updateSession(sessionId, sessionData);
}

export async function deleteSession(sessionId) {
  const isSessionAlreadyMapped = await sessionCreationService.isSessionMappedwithcourse(sessionId);

  if (isSessionAlreadyMapped.length > 0) {
    throw new Error('Session already mapped with courses unable to delete')
  }

  return await sessionCreationService.deleteSession(sessionId);
}

export async function couseSessionMapping(data, createdBy, updatedBy) {
  try {
    const isSessionAlreadyMapped = await sessionCreationService.isSessionAlreadyMapped(data.sessionId, data.courseId);
    if (isSessionAlreadyMapped) {
      throw new Error('Session already mapped')
    }

    if (!Array.isArray(data.courseId) || data.courseId.length === 0) {
      throw new Error("courseId must be a non-empty array");
    }

    if (!data.sessionId) {
      throw new Error("sessionId is required");
    }

    const mappings = [];
    for (const courseId of data.courseId) {
      const existingMapping = await sessionCreationService.getMappingByCourseAndSession(courseId, data.sessionId);
      if (existingMapping) {
        throw new Error(`Course ID ${courseId} is already mapped to Session ID ${data.sessionId}`);
      }

      mappings.push({
        sessionId: data.sessionId,
        courseId,
        createdBy,
        updatedBy
      });
    }

    await sessionCreationService.courseSectionMapping(mappings);

    return { success: true, message: "Course mappings created successfully." };

  } catch (error) {
    console.error("❌ Error inserting course-session mapping:", error);
    throw error;
  }
}

export async function deleteCouseSessionMapping(sessionCourseMappingId) {
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

  return await sessionCreationService.deleteCourseSessionMapping(sessionCourseMappingId);
}

export async function updateCouseSessionMapping(data, updatedBy) {
  data.updatedBy = updatedBy;
  const sessionCourseMappingId = data?.sessionCourseMappingId
  return await sessionCreationService.updateCouseSessionMapping(sessionCourseMappingId, data);
}
