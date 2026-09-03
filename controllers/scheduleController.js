import * as scheduleCreation from "../services/scheduleServices.js";

export async function addSchedule(req, res) {
    const requiredFields = [
        "academicYearId",
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
    try {
        const schedule = await scheduleCreation.getScheduleDetails();
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getSingleScheduleDetails(req, res) {
    try {
        const { scheduleId } = req.query;
        const schedule = await scheduleCreation.getSingleScheduleDetails(scheduleId);
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
        const { scheduleId, userId } = req.body
        if (!(scheduleId && userId)) {
            return res.status(400).send('scheduleId and userId is required')
        }
        const assignTeacher = await scheduleCreation.assignTeacher(scheduleId, userId, createdBy, updatedBy);
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

export async function getMyAssignTeacher(req, res) {
    try {
        const userId = req.user.userId;
        const assignments = await scheduleCreation.getAssignTeacher();
        const myAssignments = [];

        for (const item of assignments) {
            const row = item.get ? item.get({ plain: true }) : item;
            const employeeUserId = row.employeeSchedule ? row.employeeSchedule.userId : null;

            if (Number(row.userId) === Number(userId) || Number(employeeUserId) === Number(userId)) {
                myAssignments.push(item);
            }
        }

        res.status(200).json(myAssignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function attendence(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await scheduleCreation.attendence(req.body, createdBy, updatedBy);
        res.status(200).json({ message: "Attendance added successfully", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function addMyAttendence(req, res) {
    try {
        const createdBy = req.user.userId;
        const updatedBy = req.user.userId;
        const result = await scheduleCreation.attendence(req.body, createdBy, updatedBy);
        res.status(200).json({ message: "Attendance added successfully", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateAttendence(req, res) {
    try {
        const { teacherAttendenceId } = req.body;
        const updatedBy = req.user.userId;
        await scheduleCreation.updateAttendence(teacherAttendenceId, req.body, updatedBy);
        res.status(200).json({ message: "Attendance updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function updateMyAttendence(req, res) {
    try {
        const { teacherAttendenceId } = req.body;
        const updatedBy = req.user.userId;
        await scheduleCreation.updateAttendence(teacherAttendenceId, req.body, updatedBy);
        res.status(200).json({ message: "Attendance updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getAllAttendence(req, res) {
    const { page, limit, fromDate, toDate } = req.query
    try {
        const schedule = await scheduleCreation.getAllAttendence(page, limit, fromDate, toDate);
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function getMyAttendence(req, res) {
    const { page, limit, fromDate, toDate } = req.query;
    try {
        const userId = req.user.userId;
        const attendance = await scheduleCreation.getAllAttendence(page, limit, fromDate, toDate);
        const myData = [];

        for (const item of attendance.data) {
            const row = item.get ? item.get({ plain: true }) : item;
            const assign = row.scheduleAssign;
            const employeeUserId = assign && assign.employeeSchedule ? assign.employeeSchedule.userId : null;

            if (Number(assign?.userId) === Number(userId) || Number(employeeUserId) === Number(userId)) {
                myData.push(item);
            }
        }

        const pageSize = parseInt(limit, 10) || 10;
        res.status(200).json({
            totalRecords: myData.length,
            totalPages: Math.ceil(myData.length / pageSize),
            currentPage: parseInt(page, 10) || 1,
            data: myData,
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};