import * as courseService from '../services/courseService.js';
import { ErrorResponse, SuccessResponse } from '../utility/response.js';
import { getAcademicYearId } from '../utility/requestContext.js';

export const listCourses = async (req, res) => {
  try {
    const { campusId } = req.query;

    const result = await courseService.listCourses({ campusId });

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in List Course Controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

export const getCourseWithSubjects = async (req, res) => {
  try {
    const result = await courseService.getCourseWithSubjects(getAcademicYearId());

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in Get Course With Subjects Controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

export const getSingleCourse = async (req, res) => {
  try {
    const courseId = Number(req.query.courseId || req.params.courseId);

    if (!courseId) {
      return ErrorResponse(res, 400, "courseId is required");
    }

    const result = await courseService.getCourseByCourseId(courseId);

    if (!result) {
      return ErrorResponse(res, 404, "Course not found");
    }

    return SuccessResponse(res, 200, "Course details fetched successfully", result);
  } catch (error) {
    console.error("Error in Get Single Course Controller:", error);
    return ErrorResponse(res, 500, "Failed to fetch course details", error.message);
  }
};

export const getCourseSessions = async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);

    if (!courseId) {
      return res.status(400).json({
        status: 'error',
        message: 'courseId is required',
      });
    }

    const result = await courseService.getCourseWithSessions(courseId);

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Course not found',
      });
    }

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in Get Course Sessions Controller:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal Server Error',
      error: error.message,
    });
  }
};

export const getTermsWithClassSections = async (req, res) => {
  try {
    const { courseId, sessionId } = req.query;

    const result = await courseService.getTermsWithClassSections(courseId, sessionId);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in getTermsWithClassSections controller:', error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Internal Server Error',
    });
  }
};

export const getTermOptionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const result = await courseService.getTermOptionsByCourse(courseId);

    SuccessResponse(res, 200, 'Term options fetched successfully', result);
  } catch (error) {
    console.error('Error in Get Term Options Controller:', error);
    const statusCode = error.statusCode || 500;

    ErrorResponse(res, error.message, statusCode);
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const courseId = Number(req.params.courseId);

    if (!Number.isInteger(courseId) || courseId <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'courseId is required',
      });
    }

    const result = await courseService.deleteCourse(courseId);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in Delete Course Controller:', error);
    const statusCode = error.statusCode
      || (/Cannot delete|not found|mapped/i.test(error.message) ? 400 : 500);

    return res.status(statusCode).json({
      status: 'error',
      message: error.message || 'Internal Server Error',
    });
  }
};

export const getMyMappedSubjects = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ErrorResponse(res, 404, "User ID not found");
    }
    const { search } = req.query;
    const result = await courseService.getSubjectsByTeacherUserId(userId, search);
    return SuccessResponse(res, 200, "Teacher subjects fetched successfully from timeTable", result);
  } catch (error) {
    console.error("Error in getMyMappedSubjects controller:", error);
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
  }
};

export const getMyMappedSubjectById = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ErrorResponse(res, 404, "User ID not found");
    }
    const { subjectId } = req.query;
    const targetSubjectId = Number(subjectId || req.params.subjectId);
    if (!targetSubjectId) {
      return ErrorResponse(res, 400, "subjectId is required");
    }

    const result = await courseService.getSubjectByTeacherUserIdAndSubjectId(userId, targetSubjectId);
    if (!result) {
      return ErrorResponse(res, 404, "Subject not found or not mapped to you");
    }
    return SuccessResponse(res, 200, "Subject details fetched successfully", result);
  } catch (error) {
    console.error("Error in getMyMappedSubjectById controller:", error);
    return ErrorResponse(res, 500, "Internal Server Error", error.message);
  }
};
