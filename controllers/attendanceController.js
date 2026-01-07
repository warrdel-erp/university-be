import * as AttendanceCreation  from  "../services/attendanceServices.js";
import * as fileHandler from '../utility/fileHandler.js';

export async function addAttendance(req, res) {
    const {classSectionsId,timeTableMappingId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(timeTableMappingId && classSectionsId)){
           return res.status(400).send('timeTableMappingId and classSectionsId is required')
        }
        const newAttendance = await AttendanceCreation.addAttendance(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Attendance Add Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAttendanceDetails(req, res) {
    const role = req.user.role;    
    const instituteId = req.user.instituteId;
    const universityId = req.user.universityId;
    const {acedmicYearId} = req.query
    try {
        const Attendance = await AttendanceCreation.getAttendanceDetails(universityId,acedmicYearId,role,instituteId);
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
    const universityId = req.user.universityId;    
    const createdBy = req.user.userId;
    const instituteId = req.user.instituteId;
    const updatedBy = req.user.userId;

    const data = {  universityId, createdBy,instituteId,updatedBy }; 

    if (!(universityId && instituteId)) {
      return res.status(400).json({ error: 'universityId, instituteId are required' });
    }

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

export async function getAttendanceByDate(req, res) {
    const { date, classSectionsId,employeeId } = req.query;

    if (!date || !classSectionsId || !employeeId) {
        return res.status(400).json({ error: "required date,employeeId and classSectionsId" });
    }

    try {
        const attendance = await AttendanceCreation.getAttendanceByDate(date, classSectionsId,employeeId);

        if (!attendance || attendance.length === 0) {
            return res.status(200).json({ message: "No data available" });
        }

        return res.status(200).json(attendance);
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

export async function getPreviousClasses(req, res) {
  try {
    const employeeId = req.params.employeeId 

    if (!employeeId) {
      throw new Error("employeeId is required");
    }

    const data = await AttendanceCreation.getPreviousClasses(
      employeeId,
      req
    );
    return res.status(200).json(data);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
};