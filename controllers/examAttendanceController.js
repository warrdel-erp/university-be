import * as examAttendanceServices from "../services/examAttendanceService.js";

export async function addExamAttendance(req, res) {
    const { userId } = req.user;
    const createdBy = userId;
    const updatedBy = userId;
    const attendanceRecords = req.body;
    const instituteId = req.user.defaultInstituteId;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
        return res.status(400).send("Attendance records must be a non-empty array");
    }

    try {
        const results = [];
        for (const record of attendanceRecords) {
            const { examSetupId, studentId, attendanceStatus } = record;
            if (!examSetupId || !studentId || !attendanceStatus) {
                return res.status(400).send("Each record must contain examSetupId, studentId, and attendanceStatus");
            }
            const createdAttendance = await examAttendanceServices.addExamAttendance(
                { examSetupId, studentId, attendanceStatus },
                createdBy,
                updatedBy, instituteId
            );
            results.push(createdAttendance);
        }
        res.status(201).json({
            message: "Exam attendance created successfully",
            attendanceRecords: results,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllExamAttendance(req, res) {
    const role = req.user.role;
    const instituteId = req.user.defaultInstituteId;
    const universityId = req.user.universityId;
    const { acedmicYearId } = req.query
    try {
        const attendanceRecords = await examAttendanceServices.getAllExamAttendance(universityId, acedmicYearId, role, instituteId);
        res.status(200).json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleExamAttendance(req, res) {
    const universityId = req.user.universityId;

    try {
        const { examAttendanceId } = req.query;
        const attendanceDetails = await examAttendanceServices.getSingleExamAttendance(
            examAttendanceId,
            universityId
        );

        if (attendanceDetails) {
            res.status(200).json(attendanceDetails);
        } else {
            res.status(404).json({ message: "Exam attendance record not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateExamAttendances(req, res) {
    try {
        const body = req.body;

        if (!Array.isArray(body) || body.length === 0) {
            return res.status(422).json({ message: "Invalid or empty attendance list" });
        }
        const updatedBy = req.user.userId;
        const updatedAttendances = await examAttendanceServices.updateExamAttendances(
            body,
            updatedBy
        );

        res.status(200).json({
            message: "Exam attendances updated successfully",
            updatedAttendances,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
}


export async function deleteExamAttendance(req, res) {
    try {
        const { examAttendanceId } = req.query;

        if (!examAttendanceId) {
            return res.status(400).json({ message: "examAttendanceId is required" });
        }

        const deleted = await examAttendanceServices.deleteExamAttendance(examAttendanceId);

        if (deleted) {
            res.status(200).json({
                message: `Delete successful for exam attendance ID ${examAttendanceId}`,
            });
        } else {
            res.status(404).json({ message: "Exam attendance record not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
