import sequelize from '../database/sequelizeConfig.js';
import * as sessionCreationService  from "../repository/sessionRepository.js";

export async function addSession(sessionData, createdBy, updatedBy, universityId, instituteId) {
  const transaction = await sequelize.transaction(); 

  try {
    sessionData.createdBy = createdBy;
    sessionData.updatedBy = updatedBy;
    sessionData.universityId = universityId;
    sessionData.instituteId = instituteId;

    const session = await sessionCreationService.addSession(sessionData, { transaction});

    if (Array.isArray(sessionData.courseId) && sessionData.courseId.length > 0) {
      const mappingData = sessionData.courseId.map(courseId => ({
        universityId,
        instituteId,
        courseId,
        sessionId: session.sessionId,
        createdBy,
        updatedBy
      }));

      await sessionCreationService.courseSectionMapping(mappingData, { transaction});
    }

    await transaction.commit(); 
    return session;

  } catch (error) {
    await t.rollback();
    console.error("❌ Error creating session and mapping:", error);
    throw error;
  }
}

export async function getSessionDetails(universityId,instituteId,role,acedmicYearId) {
    return await sessionCreationService.getSessionDetails(universityId,instituteId,role,acedmicYearId);
}

export async function getSingleSessionDetails(sessionId) {
    return await sessionCreationService.getSingleSessionDetails(sessionId);
}

export async function updateSession(sessionId, sessionData, updatedBy) {    
        sessionData.updatedBy = updatedBy;
       return await sessionCreationService.updateSession(sessionId, sessionData);
}

export async function deleteSession(sessionId) {
    return await sessionCreationService.deleteSession(sessionId);
};

// export async function couseSessionMapping(data,createdBy,updatedBy,universityId,instituteId) {
// console.log(`>>>>>>>>>>>data,createdBy,updatedBy,universityId,instituteId`,data,createdBy,updatedBy,universityId,instituteId);
//         sessionData.createdBy = createdBy;
//         sessionData.updatedBy = updatedBy;
//         sessionData.universityId = universityId;
//         sessionData.instituteId = instituteId
//         const session = await sessionCreationService.addSession(sessionData);
//         return session;
// };

export async function couseSessionMapping(data, createdBy, updatedBy, universityId, instituteId) {
  try {
    console.log(`>>>>>>>>>>>data,createdBy,updatedBy,universityId,instituteId`, data, createdBy, updatedBy, universityId, instituteId);

    if (!Array.isArray(data.courseId) || data.courseId.length === 0) {
      throw new Error("courseId must be a non-empty array");
    }

    if (!data.sessionId) {
      throw new Error("sessionId is required");
    }

    const mappings = data.courseId.map(courseId => ({
      universityId,
      instituteId,
      sessionId: data.sessionId,
      courseId,
      createdBy,
      updatedBy
    }));

    await sessionCreationService.courseSectionMapping(mappings);

    return { success: true, message: "Course mappings created successfully." };

  } catch (error) {
    console.error("❌ Error inserting course-session mapping:", error);
    throw error;
  }
}
