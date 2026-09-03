import * as AttendanceCreation from "../services/attendanceServices.js";
import * as fileHandler from '../utility/fileHandler.js';
import { ErrorResponse, SuccessResponse } from "../utility/response.js";
import * as model from "../models/index.js";
import {
  assertTeacherAssignedToDateWiseIds,
  validateEmployeeUser,
} from "../utility/employeeValidation.js";

export async function addAttendance(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    const result = await AttendanceCreation.addAttendance(req.body, createdBy, updatedBy);
    const response = { message: "Attendance Add Successfully" };
    if (result.skippedPeriods?.length) {
      response.markedPeriods = result.markedPeriods;
      response.skippedPeriods = result.skippedPeriods;
    }
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function copyAttendancePeriod(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;

  try {
    const result = await AttendanceCreation.copyAttendancePeriod(req.body, createdBy, updatedBy);
    const response = {
      message: "Attendance copied successfully",
      copiedFrom: result.copiedFrom,
      markedPeriods: result.markedPeriods,
    };

    if (result.skippedPeriods?.length) {
      response.skippedPeriods = result.skippedPeriods;
    }

    res.status(201).json(response);
  } catch (error) {
    const statusCode = /not found|required|already marked|Invalid|does not belong|No attendance|not a valid copy target/i.test(error.message)
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
}

export async function getCopyAttendancePeriod(req, res) {
  try {
    const result = await AttendanceCreation.getCopyAttendanceNextPeriods(req.query);
    return SuccessResponse(res, 200, "Next copyable periods fetched successfully", result);
  } catch (error) {
    const statusCode = /not found|required|Invalid|does not belong|No attendance/i.test(error.message)
      ? 400
      : 500;
    return ErrorResponse(res, statusCode, error.message);
  }
}

export async function copyMyAttendancePeriod(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;

  try {
    const sourceId = Number(req.body.timeTableCellDateWiseId);
    const targetIds = Array.isArray(req.body.copyToTimeTableCellDateWiseId)
      ? req.body.copyToTimeTableCellDateWiseId.map(Number)
      : [Number(req.body.copyToTimeTableCellDateWiseId)];

    const dateWiseIds = [sourceId];
    for (const id of targetIds) {
      dateWiseIds.push(id);
    }

    const assignmentCheck = await assertTeacherAssignedToDateWiseIds(createdBy, dateWiseIds);
    if (!assignmentCheck.valid) {
      return res.status(assignmentCheck.status).json({ error: assignmentCheck.message });
    }

    const result = await AttendanceCreation.copyAttendancePeriod(req.body, createdBy, updatedBy);
    const response = {
      message: "Attendance copied successfully",
      copiedFrom: result.copiedFrom,
      markedPeriods: result.markedPeriods,
    };

    if (result.skippedPeriods?.length) {
      response.skippedPeriods = result.skippedPeriods;
    }

    res.status(201).json(response);
  } catch (error) {
    const statusCode = /not found|required|already marked|Invalid|does not belong|No attendance|not a valid copy target/i.test(error.message)
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message });
  }
}

export async function getMyCopyAttendancePeriod(req, res) {
  try {
    const userId = req.user.userId;
    const assignmentCheck = await assertTeacherAssignedToDateWiseIds(
      userId,
      req.query.timeTableCellDateWiseId,
    );
    if (!assignmentCheck.valid) {
      return ErrorResponse(res, assignmentCheck.status, assignmentCheck.message);
    }

    const result = await AttendanceCreation.getCopyAttendanceNextPeriods(req.query);
    return SuccessResponse(res, 200, "Next copyable periods fetched successfully", result);
  } catch (error) {
    const statusCode = /not found|required|Invalid|does not belong|No attendance/i.test(error.message)
      ? 400
      : 500;
    return ErrorResponse(res, statusCode, error.message);
  }
}

export async function getAttendanceDetails(req, res) {
  try {
    const Attendance = await AttendanceCreation.getAttendanceDetails();
    res.status(200).json(Attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function updateAttendance(req, res) {

  try {
    const attendanceRecords = req.body;

    const updatedBy = req.user.userId;
    const updatePromises = attendanceRecords.map(async (record) => {
      const { attendanceId } = record;
      if (!attendanceId) {
        throw new Error('Attendance Id is required for each record');
      }
      return AttendanceCreation.updateAttendance(attendanceId, record, updatedBy);
    });

    await Promise.all(updatePromises);
    res.status(200).json({ message: "Attendance records updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export async function addMyAttendance(req, res) {
  const createdBy = req.user.userId;
  const updatedBy = req.user.userId;
  try {
    const { timeTableCellDateWiseId } = req.body;
    if (!timeTableCellDateWiseId) {
      return res.status(400).json({ error: "timeTableCellDateWiseId is required" });
    }

    const ids = Array.isArray(timeTableCellDateWiseId)
      ? timeTableCellDateWiseId.map(Number)
      : [Number(timeTableCellDateWiseId)];

    const assignments = await model.timeTableCellTeachersDateWiseModel.findAll({
      where: {
        timeTableCellDateWiseId: ids,
        userId: createdBy,
      },
    });

    if (assignments.length !== ids.length) {
      return res.status(403).json({
        error: "Forbidden: You are not assigned to one or more of these scheduled periods.",
      });
    }

    const result = await AttendanceCreation.addAttendance(req.body, createdBy, updatedBy);
    const response = { message: "Attendance Add Successfully" };
    if (result.skippedPeriods?.length) {
      response.markedPeriods = result.markedPeriods;
      response.skippedPeriods = result.skippedPeriods;
    }
    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export async function updateMyAttendance(req, res) {
  try {
    const attendanceRecords = req.body;
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ error: "Request body must be a non-empty array of records" });
    }

    const updatedBy = req.user.userId;
    const attendanceIds = attendanceRecords.map(r => Number(r.attendanceId)).filter(Boolean);

    const attendances = await model.attendanceModel.findAll({
      where: { attendanceId: attendanceIds },
      attributes: ["attendanceId", "timeTableCellDateWiseId"],
    });

    const cellIds = attendances.map(a => a.timeTableCellDateWiseId).filter(Boolean);

    const assignments = await model.timeTableCellTeachersDateWiseModel.findAll({
      where: {
        timeTableCellDateWiseId: cellIds,
        userId: updatedBy,
      },
    });

    const assignedCellIds = new Set(assignments.map(a => a.timeTableCellDateWiseId));

    for (const att of attendances) {
      if (!assignedCellIds.has(att.timeTableCellDateWiseId)) {
        return res.status(403).json({
          error: "Forbidden: One or more attendance records do not belong to your assigned periods.",
        });
      }
    }

    const updatePromises = attendanceRecords.map(async (record) => {
      const { attendanceId } = record;
      if (!attendanceId) {
        throw new Error('Attendance Id is required for each record');
      }
      return AttendanceCreation.updateAttendance(attendanceId, record, updatedBy);
    });

    await Promise.all(updatePromises);
    res.status(200).json({ message: "Attendance records updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const importAttendance = async (req, res) => {
  try {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    const data = { createdBy, updatedBy };

    const excelFile = req.files?.attendance;
    if (!excelFile) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    const excelData = fileHandler.readExcelFile(excelFile.data);
    if (!excelData) {
      return res.status(400).json({ error: 'Error reading the Excel file' });
    }

    const result = await AttendanceCreation.importAttendanceData(excelData, data);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ message: result.message });

  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
};

export const importMyAttendance = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.message });
    }

    return importAttendance(req, res);
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred" });
  }
};

export const importBulkAttendance = async (req, res) => {
  try {
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;

    const data = { createdBy, updatedBy };

    const excelFile = req.files?.attendance;
    if (!excelFile) {
      return res.status(400).json({ error: 'Excel file is required' });
    }

    // Pass the buffer instead of relying on fileHandler.readExcelFile which might return a too simplified JSON
    const result = await AttendanceCreation.importBulkAttendanceData(excelFile.data, data);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({ message: result.message });

  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
};

export const importMyBulkAttendance = async (req, res) => {
  try {
    const validation = await validateEmployeeUser(req, res);
    if (!validation.valid) {
      return res.status(validation.status).json({ error: validation.message });
    }

    return importBulkAttendance(req, res);
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message || "An unexpected error occurred" });
  }
};

export async function getAttendanceByDate(req, res) {
  const { date, classSectionTermId, userId } = req.query;

  try {
    const attendance = await AttendanceCreation.getAttendanceByDate(date, classSectionTermId, userId);

    if (!attendance || attendance.length === 0) {
      return res.status(200).json({ message: "No data available" });
    }

    return res.status(200).json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export async function getPreviousSessions(req, res) {
  try {
    const userId = req.params.userId

    if (!userId) {
      throw new Error("userId is required");
    }

    const data = await AttendanceCreation.getPreviousSessions(
      userId,
      req
    );
    return res.status(200).json(data);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export async function getStudentAttendanceReport(req, res) {
  try {
    const { classSectionId, subjectId, userId } = req.query;

    const data = await AttendanceCreation.getStudentAttendanceReport(
      classSectionId,
      subjectId,
      userId
    );

    return SuccessResponse(res, 200, "Attendance Report Fetched Successfully", data);
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred' });
  }
};

export async function getStudentsBatchAttendance(req, res) {
  try {
    const { classSectionTermId, filters } = req.body;

    const data = await AttendanceCreation.getStudentsBatchAttendance(
      classSectionTermId,
      filters
    );

    return SuccessResponse(res, 200, "Student attendance fetched successfully", data);
  } catch (error) {
    console.error("Controller Error:", error);
    const status = error.statusCode || (/required|must be/i.test(error.message || '') ? 400 : 500);
    return ErrorResponse(res, status, error.message || 'An unexpected error occurred');
  }
};

export async function getMyStudentsBatchAttendance(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return ErrorResponse(res, 404, "User ID not found");
    }

    const { classSectionTermId, filters } = req.body;
    const dateWiseIds = [];
    for (const filter of filters || []) {
      const id = Number(filter.timeTableCellDateWiseId);
      if (id) {
        dateWiseIds.push(id);
      }
    }

    const assignmentCheck = await assertTeacherAssignedToDateWiseIds(userId, dateWiseIds);
    if (!assignmentCheck.valid) {
      return ErrorResponse(res, assignmentCheck.status, assignmentCheck.message);
    }

    const data = await AttendanceCreation.getStudentsBatchAttendance(
      classSectionTermId,
      filters,
    );

    return SuccessResponse(res, 200, "Student attendance fetched successfully", data);
  } catch (error) {
    console.error("Controller Error:", error);
    const status = error.statusCode || (/required|must be/i.test(error.message || '') ? 400 : 500);
    return ErrorResponse(res, status, error.message || "An unexpected error occurred");
  }
}

export async function getEmployeeSectionDates(req, res) {
  try {
    const { classSectionTermId, subjectId, userId } = req.query;

    const data = await AttendanceCreation.getEmployeeSectionDates(
      classSectionTermId,
      subjectId,
      userId
    );

    return SuccessResponse(res, 200, "Employee section dates fetched successfully", data);
  } catch (error) {
    console.error("Controller Error:", error);
    ErrorResponse(res, 500, error.message || 'An unexpected error occurred');
  }
};