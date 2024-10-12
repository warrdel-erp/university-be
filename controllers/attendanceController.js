import * as AttendanceCreation  from  "../services/attendanceServices.js";

export async function addAttendance(req, res) {
    const {classSectionsId,timeTableCreateId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    try {
        if(!(timeTableCreateId && classSectionsId)){
           return res.status(400).send('timeTableCreateId and classSectionsId is required')
        }
        const newAttendance = await AttendanceCreation.addAttendance(req.body,createdBy,updatedBy);
        res.status(201).json({ message: "Attendance Add Successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getAttendanceDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const Attendance = await AttendanceCreation.getAttendanceDetails(universityId);
        res.status(200).json(Attendance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateAttendance(req, res) {
    console.log(`>>>>>>>req.body>>>>>>`, req.body);

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
}