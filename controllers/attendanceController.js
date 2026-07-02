import * as AttendanceCreation from "../services/attendanceServices.js";
import * as fileHandler from '../utility/fileHandler.js';
import { ErrorResponse, SuccessResponse } from "../utility/response.js";

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

export async function getAttendanceByDate(req, res) {
  const { date, classSectionTermId, employeeId } = req.query;

  try {
    const attendance = await AttendanceCreation.getAttendanceByDate(date, classSectionTermId, employeeId);

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
    const employeeId = req.params.employeeId

    if (!employeeId) {
      throw new Error("employeeId is required");
    }

    const data = await AttendanceCreation.getPreviousSessions(
      employeeId,
      req
    );
    return res.status(200).json(data);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};

export async function getStudentAttendanceReport(req, res) {
  try {
    const { classSectionId, subjectId, employeeId } = req.query;

    const data = await AttendanceCreation.getStudentAttendanceReport(
      classSectionId,
      subjectId,
      employeeId
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

    return SuccessResponse(res, 200, "Student Batch Attendance Fetched Successfully", data);
  } catch (error) {
    console.error("Controller Error:", error);
    ErrorResponse(res, 500, error.message || 'An unexpected error occurred');
  }
};

export async function getEmployeeSectionDates(req, res) {
  try {
    const { classSectionTermId, subjectId, employeeId } = req.query;

    const data = await AttendanceCreation.getEmployeeSectionDates(
      classSectionTermId,
      subjectId,
      employeeId
    );

    return SuccessResponse(res, 200, "Employee section dates fetched successfully", data);
  } catch (error) {
    console.error("Controller Error:", error);
    ErrorResponse(res, 500, error.message || 'An unexpected error occurred');
  }
};