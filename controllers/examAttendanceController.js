import * as examAttendanceServices from "../services/examAttendanceService.js";
import { SuccessResponse, ErrorResponse } from "../utility/response.js";

export async function addExamAttendance(req, res) {
    const { userId } = req.user;
    const createdBy = userId;
    const updatedBy = userId;
    const attendanceRecords = req.body;
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
        return res.status(400).send("Attendance records must be a non-empty array");
    }

    try {
        const results = [];
        for (const record of attendanceRecords) {
            const {
                examScheduleId,
                examScheduleRoomCapacityId,
                studentId,
                studentExamSeatId,
                attendanceStatus,
                markedBy,
                markedAt,
                remarks,
                universityId,
                instituteId,
                academicYearId
            } = record;
            if (!examScheduleId || !examScheduleRoomCapacityId || !studentId || !attendanceStatus || !universityId || !instituteId || !academicYearId) {
                return res.status(400).send("Each record must contain examScheduleId, examScheduleRoomCapacityId, studentId, attendanceStatus, universityId, instituteId, and academicYearId");
            }
            const createdAttendance = await examAttendanceServices.addExamAttendance(
                {
                    examScheduleId,
                    examScheduleRoomCapacityId,
                    studentId,
                    studentExamSeatId,
                    attendanceStatus,
                    markedBy: markedBy || userId,
                    markedAt: markedAt || new Date(),
                    remarks,
                    universityId,
                    instituteId,
                    academicYearId
                },
                createdBy,
                updatedBy
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
}

export async function getAllExamAttendance(req, res) {
    const { academicYearId } = req.query;
    try {
        const attendanceRecords = await examAttendanceServices.getAllExamAttendance(academicYearId);
        res.status(200).json(attendanceRecords);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleExamAttendance(req, res) {
    try {
        const { examAttendanceId } = req.query;
        const attendanceDetails = await examAttendanceServices.getSingleExamAttendance(examAttendanceId);

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

export async function getExamOperationsAttendance(req, res) {
    try {
        const filters = {
            examinationSessionId: req.query.examinationSessionId,
            examDate: req.query.examDate,
            examinationSessionSlotId: req.query.examinationSessionSlotId,
            courseId: req.query.courseId,
            sessionId: req.query.sessionId,
            term: req.query.term,
            search: req.query.search,
            page: req.query.page ? Number(req.query.page) : 1,
            limit: req.query.limit ? Number(req.query.limit) : 10
        };

        const result = await examAttendanceServices.getExamOperationsAttendance(filters);
        return SuccessResponse(
            res,
            200,
            "Exam operations attendance fetched successfully",
            result.data,
            result.paginationData
        );
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getExamOperationsAttendanceRoom(req, res) {
    try {
        const { examScheduleId, examScheduleRoomCapacityId } = req.query;
        if (!examScheduleId || !examScheduleRoomCapacityId) {
            return ErrorResponse(res, 400, "Missing required query parameters: examScheduleId, examScheduleRoomCapacityId");
        }

        const result = await examAttendanceServices.getExamOperationsAttendanceRoom(
            Number(examScheduleId),
            Number(examScheduleRoomCapacityId)
        );
        return SuccessResponse(res, 200, "Exam operations attendance room details fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function markExamAttendance(req, res) {
    try {
        const { examScheduleId, examScheduleRoomCapacityId, students } = req.body;
        if (!examScheduleId || !examScheduleRoomCapacityId || !Array.isArray(students)) {
            return ErrorResponse(res, 400, "Invalid or missing parameters in request body");
        }

        const result = await examAttendanceServices.markExamAttendance({
            examScheduleId,
            examScheduleRoomCapacityId,
            students
        }, req.user);

        return SuccessResponse(res, 200, "Exam attendance marked successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function updateRoomAttendanceStatus(req, res) {
    try {
        const { examScheduleId, examScheduleRoomCapacityId, status } = req.body;
        if (!examScheduleId || !examScheduleRoomCapacityId || !status) {
            return ErrorResponse(res, 400, "Missing required parameters: examScheduleId, examScheduleRoomCapacityId, status");
        }

        const result = await examAttendanceServices.updateRoomAttendanceStatus({
            examScheduleId: Number(examScheduleId),
            examScheduleRoomCapacityId: Number(examScheduleRoomCapacityId),
            status
        });

        return SuccessResponse(res, 200, "Exam room attendance status updated successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getExamAttendanceDetails(req, res) {
    try {
        const { examScheduleId } = req.params;
        if (!examScheduleId) {
            return ErrorResponse(res, 400, "Missing required parameter: examScheduleId");
        }

        const result = await examAttendanceServices.getExamAttendanceDetails(Number(examScheduleId));
        return SuccessResponse(res, 200, "Exam attendance details fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}

export async function getExamOperationsSummary(req, res) {
    try {
        const { examinationSessionId } = req.query;
        if (!examinationSessionId) {
            return ErrorResponse(res, 400, "Missing required parameter: examinationSessionId");
        }

        const filters = {
            courseId: req.query.courseId ? Number(req.query.courseId) : undefined,
            sessionId: req.query.sessionId ? Number(req.query.sessionId) : undefined,
            term: req.query.term ? Number(req.query.term) : undefined,
            examDate: req.query.examDate,
            examinationSessionSlotId: req.query.examinationSessionSlotId ? Number(req.query.examinationSessionSlotId) : undefined
        };

        const result = await examAttendanceServices.getExamOperationsSummary(Number(examinationSessionId), filters);
        return SuccessResponse(res, 200, "Exam operations summary fetched successfully", result);
    } catch (error) {
        return ErrorResponse(res, 500, error.message);
    }
}
