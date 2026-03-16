import * as scheduleCreation from "../services/scheduleServices.js";

export async function addSchedule(req, res) {
    const requiredFields = [
        "acedmicYearId",
        "scheduleName",
        "shiftHours",
        "minStartTime",
        "minEndTime",
        "maxStartTime",
        "maxEndTime",
        "startTime",
        "endTime"
    ];

    const data = {
        universityId: req.user.universityId,
        instituteId: req.user.defaultInstituteId,
        createdBy: req.user.userId,
        updatedBy: req.user.userId,
        ...req.body
    };

    try {
        for (const field of requiredFields) {
            if (!data[field]) {
                return res.status(400).json({ message: `${field} is required` });
            }
        }

        const schedule = await scheduleCreation.addSchedule(data, data.createdBy, data.updatedBy);
        return schedule
            ? res.status(201).json({ message: "Data added successfully", schedule })
            : res.status(404).json({ message: "Something went wrong" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllSchedule(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    const { acedmicYearId } = req.query
    try {
        const schedule = await scheduleCreation.getScheduleDetails(universityId, acedmicYearId, instituteId, role);
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleScheduleDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { scheduleId } = req.query;
        const schedule = await scheduleCreation.getSingleScheduleDetails(scheduleId, universityId);
        if (schedule) {
            res.status(200).json(schedule);
        } else {
            res.status(404).json({ message: "schedule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateSchedule(req, res) {
    try {
        const { scheduleId } = req.body
        if (!(scheduleId)) {
            return res.status(400).send('scheduleId is required')
        }
        const updatedBy = req.user.userId;
        const updatedSchedule = await scheduleCreation.updateSchedule(scheduleId, req.body, updatedBy);
        res.status(200).json({ message: "schedule update succesfully", updateSchedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function deleteSchedule(req, res) {
    try {
        const { scheduleId } = req.query;
        if (!scheduleId) {
            return res.status(400).json({ message: "scheduleId is required" });
        }
        const deleted = await scheduleCreation.deleteSchedule(scheduleId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for schedule ID ${scheduleId}` });
        } else {
            res.status(404).json({ message: "schedule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function assignTeacher(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const { scheduleId, employeeId } = req.body
        if (!(scheduleId && employeeId)) {
            return res.status(400).send('scheduleId and employeeId is required')
        }
        const assignTeacher = await scheduleCreation.assignTeacher(scheduleId, employeeId, createdBy, updatedBy);
        res.status(200).json({ message: "schedule assignTeacher succesfully", assignTeacher });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAssignTeacher(req, res) {
    try {
        const schedule = await scheduleCreation.getAssignTeacher();
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function attendence(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const { scheduleAssignId } = req.body
        if (!(scheduleAssignId)) {
            return res.status(400).send('scheduleAssignId is required')
        }
        const assignTeacher = await scheduleCreation.attendence(req.body, createdBy, updatedBy);
        res.status(200).json({ message: "schedule assignTeacher succesfully", assignTeacher });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateAttendence(req, res) {
    try {
        const { teacherAttendenceId } = req.body
        if (!(teacherAttendenceId)) {
            return res.status(400).send('teacherAttendenceId is required')
        }
        const updatedBy = req.user.userId;
        const updatedSchedule = await scheduleCreation.updateAttendence(teacherAttendenceId, req.body, updatedBy);
        res.status(200).json({ message: "schedule update succesfully", updateSchedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllAttendence(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.defaultInstituteId;
    const role = req.user.role;
    const { page, limit, fromDate, toDate } = req.query
    try {
        const schedule = await scheduleCreation.getAllAttendence(universityId, instituteId, role, page, limit, fromDate, toDate);
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};