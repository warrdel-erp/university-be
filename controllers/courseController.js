import * as courseService from '../services/courseService.js';
import { ErrorResponse, SuccessResponse } from '../utility/response.js';

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
    const { acedmicYearId } = req.query;

    const result = await courseService.getCourseWithSubjects(acedmicYearId);

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

export const getClassSectionsGrouped = async (req, res) => {
  try {
    const { courseId, sessionId } = req.query;

    const result = await courseService.getClassSectionsGroupedByTerm(courseId, sessionId);

    return res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    console.error('Error in Get Class Sections Grouped Controller:', error);
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
