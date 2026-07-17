import * as sessionCreationService from "../repository/sessionRepository.js";

import { assertCourseIsActive } from "../repository/courseRepository.js";



function mapUniqueConstraintError(error) {

  if (error?.name === "SequelizeUniqueConstraintError") {

    throw new Error("This course is already mapped to the selected session.");

  }

  throw error;

}



export async function addSession(sessionData, createdBy, updatedBy) {

  try {

    return await sessionCreationService.createSessionWithCourseMappings(

      sessionData,

      createdBy,

      updatedBy,

    );

  } catch (error) {

    mapUniqueConstraintError(error);

  }

}



export async function getSessionDetails() {

  return await sessionCreationService.getSessionDetails();

}



export async function getSingleSessionDetails(sessionId) {

  return await sessionCreationService.getSingleSessionDetails(sessionId);

}



export async function updateSession(sessionId, sessionData, updatedBy) {

  try {

    return await sessionCreationService.updateSessionWithCourseMappings(

      sessionId,

      sessionData,

      updatedBy,

    );

  } catch (error) {

    mapUniqueConstraintError(error);

  }

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

      rejectExisting: true,

    });



    return { success: true, message: "Course mappings created successfully." };

  } catch (error) {

    mapUniqueConstraintError(error);

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



  return sessionCreationService.updateCouseSessionMapping(sessionCourseMappingId, payload);

}

