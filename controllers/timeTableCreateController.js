import * as timeTableCreateServices from "../services/timeTableCreateServices.js";
import * as timeTableServices from "../services/timeTableServices.js";
import * as academicGroupScopeService from "../services/academicGroupScopeService.js";
import { ErrorResponse, SuccessResponse } from "../utility/response.js";
import { validateEmployeeUser } from "../utility/employeeValidation.js";

export const addtimeTableCreate = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const result = await timeTableCreateServices.addtimeTableCreate(
      data,
      createdBy,
      updatedBy,
    );
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in adding time table create :", error);
    const message = error.message || "Internal Server Error";
    const statusCode =
      /required|not found|does not match|could not be resolved|overlap|conflict|Routine already exists|Teacher conflict|Room conflict|must be inside|within the mapped date range|Map the course to the structure first|Invalid mapperId/i.test(
        message,
      )
        ? 400
        : 500;
    res.status(statusCode).send(message);
  }
};

export const cloneTimeTableRoutine = async (req, res) => {
  try {
    const { previousRoutineId, startingDate, endingDate, previousDate } =
      req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const result = await timeTableCreateServices.cloneTimeTableRoutine(
      previousRoutineId,
      startingDate,
      endingDate,
      createdBy,
      updatedBy,
      previousDate,
    );
    return SuccessResponse(res, 200, "Routine cloned successfully", result);
  } catch (error) {
    console.error("Error in cloning time table routine:", error);
    return ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error",
    );
  }
};

export const gettimeTableCreateDetails = async (req, res) => {
  try {
    const { courseId, sessionId } = req.query;
    const result = await timeTableCreateServices.gettimeTableCreateDetails({
      courseId,
      sessionId,
    });
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table create:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getSingletimeTableCreateDetails = async (req, res) => {
  const { courseId } = req.query;
  try {
    const result =
      await timeTableCreateServices.getSingletimeTableCreateDetails(courseId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting single time table create:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getTimeTableByCourseAndSection = async (req, res) => {
  const { courseId, classSectionTermId, timeTableType } = req.query;
  try {
    const result = await timeTableCreateServices.getTimeTableByCourseAndSection(
      courseId,
      classSectionTermId,
      timeTableType,
    );
    SuccessResponse(res, 200, "Time table fetched successfully", result);
  } catch (error) {
    ErrorResponse(res, 500, "Internal Server Error");
    console.error("Error fetching timetable:", error);
  }
};

export const addtimeTableMapping = async (req, res) => {
  try {
    const data = req.body;
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const result = await timeTableCreateServices.addtimeTableMapping(
      data,
      createdBy,
      updatedBy,
    );
    res.status(200).send(result);
  } catch (error) {
    res.status(error.statusCode || 400).send({
      success: false,
      message: error.message || "Something went wrong",
    });
  }
};

export const getTimeTableMappingDetail = async (req, res) => {
  const { timeTableRoutineId } = req.body;
  try {
    const result =
      await timeTableCreateServices.getTimeTableMappingDetail(
        timeTableRoutineId,
      );
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table create:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getSingletimeTableMappingDetail = async (req, res) => {
  const { courseId } = req.query;
  try {
    const result =
      await timeTableCreateServices.getSingletimeTableMappingDetail(courseId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting single time table create:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const changeTimeTableCreate = async (req, res) => {
  const updatedBy = req.user.userId;
  try {
    if (Array.isArray(req.body)) {
      const result = await timeTableServices.updateTimeTable(req.body);
      return SuccessResponse(
        res,
        200,
        "Time table updated successfully",
        result,
      );
    }

    const result = await timeTableCreateServices.changeTimeTableCreate(
      req.body,
      updatedBy,
    );
    return SuccessResponse(res, 200, "Routine updated successfully", result);
  } catch (error) {
    console.error("Error in updating time table create", error);
    const message = error.message || "Internal Server Error";
    const statusCode =
      /not found|cannot be updated|starting date|overlap|conflict|Routine already exists|Teacher conflict|Room conflict|does not match|required|must be inside|within the mapped date range|Map the course to the structure first|Invalid mapperId/i.test(
        message,
      )
        ? 400
        : 500;
    return ErrorResponse(res, statusCode, message);
  }
};

export const updatetimeTableCreate = async (req, res) => {
  const { timeTableType, timeTableCellId } = req.body;
  const updatedBy = req.user.userId;
  try {
    const result = await timeTableCreateServices.updatetimeTableCreate(
      timeTableCellId,
      timeTableType,
      updatedBy,
    );
    res.status(200).send(result);
  } catch (error) {
    console.error(`Error in updating time table type`, error);
    const message = error.message || "Internal Server Error";
    const statusCode =
      error.statusCode ||
      (/not found|published routine|date-wise|conflict|required/i.test(message)
        ? 400
        : 500);
    return ErrorResponse(res, statusCode, message);
  }
};

export const updateSimpleTeacherMappingController = async (req, res) => {
  try {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const result = await timeTableCreateServices.updateSimpleTeacherMapping(
      req.body,
      createdBy,
      updatedBy,
    );
    res.status(200).send(result);
  } catch (err) {
    console.error("Error in updateSimpleTeacherMappingController:", err);
    const message = err.message || "Internal Server Error";
    const statusCode =
      err.statusCode ||
      (/not found|published routine|date-wise|conflict|required/i.test(message)
        ? 400
        : 500);
    return ErrorResponse(res, statusCode, message);
  }
};

export const deletetimeTableMapping = async (req, res) => {
  const { timeTableCellId, deleteCombinedGroup } = req.query;
  try {
    const result = await timeTableCreateServices.deletetimeTableMapping(
      timeTableCellId,
      {
        deleteCombinedGroup:
          deleteCombinedGroup === true || deleteCombinedGroup === "true",
      },
    );
    return SuccessResponse(res, 200, result.message, result);
  } catch (error) {
    console.error(
      `Error in deleting time table mapping Id ${timeTableCellId}:`,
      error,
    );
    const message = error.message || "Internal Server Error";
    const statusCode =
      error.statusCode ||
      (/not found/i.test(message)
        ? 404
        : /starting date|published routine|cannot edit or delete/i.test(message)
          ? 400
          : 500);
    return ErrorResponse(res, statusCode, message);
  }
};

export const deleteTimeTableTeacherController = async (req, res) => {
  const { timeTableCellTeacherId } = req.query;
  try {
    const result = await timeTableCreateServices.deleteTimeTableTeacher(
      timeTableCellTeacherId,
    );
    return SuccessResponse(res, 200, result.message, result);
  } catch (error) {
    console.error(
      `Error in deleting time table teacher Id ${timeTableCellTeacherId}:`,
      error,
    );
    const message = error.message || "Internal Server Error";
    const statusCode =
      error.statusCode || (/not found/i.test(message) ? 404 : 500);
    return ErrorResponse(res, statusCode, message);
  }
};

export const getTimeTableCellData = async (req, res) => {
  const { courseId, classSectionTermId } = req.query;
  try {
    const result = await timeTableCreateServices.getTimeTableCellData(
      courseId,
      classSectionTermId,
    );
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table cell data:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const getTimeTableElective = async (req, res) => {
  const { courseId } = req.query;
  try {
    const result = await timeTableCreateServices.getTimeTableElective(courseId);
    res.status(200).send(result);
  } catch (error) {
    console.error("Error in getting time table cell data:", error);
    res.status(500).send("Internal Server Error");
  }
};

export const publishTimeTable = async (req, res) => {
  try {
    const { timeTableRoutineId } = req.query;
    const response =
      await timeTableCreateServices.publishTimeTableService(timeTableRoutineId);
    return SuccessResponse(res, 200, response.message, response);
  } catch (error) {
    console.error(
      `Error in publishing timetable routine ${req.query.timeTableRoutineId}:`,
      error,
    );
    const message = error.message || "Internal Server Error";
    const statusCode =
      error.statusCode ||
      (/not found/i.test(message)
        ? 404
        : /required|cannot|invalid|already exists/i.test(message)
          ? 400
          : 500);
    return ErrorResponse(res, statusCode, message);
  }
};

export const deleteTimeTableRoutine = async (req, res) => {
  try {
    const { timeTableRoutineId } = req.query;
    const result =
      await timeTableCreateServices.deleteTimeTableRoutine(timeTableRoutineId);
    return SuccessResponse(res, 200, result.message, result);
  } catch (error) {
    console.error(
      `Error in deleting routine ${req.query.timeTableRoutineId}:`,
      error,
    );
    const message = error.message || "Internal Server Error";
    const statusCode = /not found/i.test(message)
      ? 404
      : /cannot be deleted|cannot be updated|starting date/i.test(message)
        ? 400
        : 500;
    return ErrorResponse(res, statusCode, message);
  }
};

export const ClassSubjectCount = async (req, res) => {
  try {
    const { classSectionTermId } = req.query;
    const response =
      await timeTableCreateServices.getSubjectWithCount(classSectionTermId);
    res.status(200).send(response);
  } catch (error) {
    res.status(500).send(error.message);
  }
};

export const getRoutineByClassSectionId = async (req, res) => {
  const { classSectionTermId } = req.query;
  try {
    const result = await timeTableCreateServices.getRoutineByClassSectionId(classSectionTermId);
    SuccessResponse(res, 200, 'Routine fetched successfully', result);
  } catch (error) {
    console.error("GET ROUTINE ERROR:", error);
    ErrorResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const getRoutineByAcademicGroupId = async (req, res) => {
  const { academicGroupId } = req.query;
  try {
    const result =
      await timeTableCreateServices.getRoutineByAcademicGroupId(
        academicGroupId,
      );
    SuccessResponse(res, 200, "Routine fetched successfully", result);
  } catch (error) {
    console.error("Error in getting routine by academic group ID:", error);
    ErrorResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const getRoutineByTeacherAndAcademicYear = async (req, res) => {
  const { userId, courseId, sessionId, subjectId } = req.query;
  try {
    const result =
      await timeTableCreateServices.getRoutineByTeacherAndAcademicYear(
        userId,
        courseId,
        sessionId,
        subjectId,
      );
    return SuccessResponse(
      res,
      200,
      "Teacher routine fetched successfully",
      result,
    );
  } catch (error) {
    console.error(
      "Error in getting routine by teacher and academic year:",
      error,
    );
    return ErrorResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const getMyRoutineByTeacherAndAcademicYear = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return ErrorResponse(res, validation.status, validation.message);
    }
    const { userId } = validation;
    const { courseId, sessionId, subjectId } = req.query;
    const result =
      await timeTableCreateServices.getRoutineByTeacherAndAcademicYear(
        userId,
        courseId,
        sessionId,
        subjectId,
      );
    return SuccessResponse(
      res,
      200,
      "Teacher routine fetched successfully",
      result,
    );
  } catch (error) {
    console.error(
      "Error in getting routine by teacher and academic year:",
      error,
    );
    return ErrorResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const getDateWiseCellsBySection = async (req, res) => {
  const { courseId, sessionId, classSectionTermId, date } = req.query;
  try {
    const result = await timeTableCreateServices.getDateWiseCellsBySection(
      courseId,
      sessionId,
      classSectionTermId,
      { date },
    );
    return SuccessResponse(
      res,
      200,
      "Date-wise cells fetched successfully",
      result,
    );
  } catch (error) {
    console.error("Error in getting date-wise cells:", error);
    return ErrorResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const updateDateWiseCellController = async (req, res) => {
  const {
    timeTableCellDateWiseId,
    timeTableCellTeachersDateWiseId,
    userId,
    subjectId,
    electiveSubjectId,
    classRoomSectionId,
  } = req.body;
  const updatedBy = req.user.userId;
  try {
    const result = await timeTableCreateServices.updateDateWiseCell(
      timeTableCellDateWiseId,
      {
        timeTableCellTeachersDateWiseId,
        userId,
        subjectId,
        electiveSubjectId,
        classRoomSectionId,
      },
      updatedBy,
    );
    return SuccessResponse(
      res,
      200,
      "Date-wise cell updated successfully",
      result,
    );
  } catch (error) {
    console.error("Error in updating date-wise cell:", error);
    const statusCode = /not found|published/i.test(error.message || "")
      ? 400
      : 500;
    return ErrorResponse(
      res,
      statusCode,
      error.message || "Internal Server Error",
    );
  }
};

export const getCascadingGroupRoutines = async (req, res) => {
  try {
    const { academicGroupScopeId, academicGroupId, sessionId } = req.query;
    const result =
      await academicGroupScopeService.getCascadingGroupRoutinesService({
        academicGroupScopeId,
        academicGroupId,
        sessionId,
      });
    return SuccessResponse(
      res,
      200,
      "Cascading group routines fetched successfully",
      result,
    );
  } catch (error) {
    console.error("Error in getting cascading group routines:", error);
    return ErrorResponse(res, 500, error.message || "Internal Server Error");
  }
};

export const fillMissingSubjectsController = async (req, res) => {
  try {
    const data = {
      '3AR4': [1876, 1877, 1878, 1879, 1880, 1881, 1886, 1887, 1888, 1889, 1239, 1242, 1245, 1248, 1251, 1254, 1271, 1274, 1277, 1280, 1063, 1066, 1069, 1072, 1075, 1078, 1095, 1098, 1101, 1104, 1117, 1120, 1123, 1126, 1129, 1132, 1153, 1156, 1159, 1162, 1293, 1296, 1299, 1302, 1305, 1308, 1906, 1907, 1908, 1909, 1910, 1911, 2213, 2214, 2215, 2216, 2217, 2218, 1329, 1332, 1335, 1338, 1922, 1923, 1924, 1925, 2229, 2230, 2231, 2232],
      "3AR3": [1882, 1883, 1265, 1266, 1089, 1090],
      '3AR2': [1894, 1895, 1395, 1396, 1145, 1146, 1321, 1322, 1916, 1917],
      '3AR5': [1399, 1400, 1165, 1166, 1409, 1410, 1926, 1927, 2233, 2234],
      '5AR4': [2261, 2259, 2257, 2255, 2253, 2251, 1951, 1949, 1947, 1945, 1943, 1941, 1735, 1732, 1729, 1726, 1723, 1720, 788, 785, 782, 779, 776, 773, 2298, 2297, 2296, 2295, 2294, 2293, 1981, 1980, 1979, 1978, 1977, 1976, 1793, 1790, 1787, 1784, 1781, 1778, 1476, 1473, 1470, 1467, 1464, 1461, 843, 840, 837, 834, 831, 828, 869, 872, 875, 878, 1501, 1504, 1507, 1510, 1818, 1821, 1824, 1827, 1994, 1995, 1996, 1997, 2311, 2312, 2313, 2314],
      '5AR3': [859, 860, 1491, 1492, 1808, 1809, 1988, 1989, 2305, 2306],
      '7AR3': [911, 912, 1539, 1540, 2011, 2012]
    };

    const updatedBy = req.user.userId;
    const result = await timeTableCreateServices.fillMissingSubjectsService(
      data,
      updatedBy,
    );
    SuccessResponse(res, 200, "Missing subjects filled successfully", result);
  } catch (error) {
    console.error("Error in filling missing subjects:", error);
    ErrorResponse(
      res,
      error.statusCode || 500,
      error.message || "Internal Server Error"
    );
  }
};
