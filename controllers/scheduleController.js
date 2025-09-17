import * as scheduleCreation  from  "../services/scheduleServices.js";

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
    universityId : req.user.universityId,
    instituteId : req.user.instituteId,
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
}


export async function getAllSchedule(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const {acedmicYearId} = req.query
    try {
        const schedule = await scheduleCreation.getScheduleDetails(universityId,acedmicYearId,instituteId,role);
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function getSingleScheduleDetails(req, res) {
    const universityId = req.user.universityId;
    try {
        const { ScheduleId } = req.query;
        const schedule = await scheduleCreation.getSingleScheduleDetails(ScheduleId,universityId);
        if (schedule) {
            res.status(200).json(schedule);
        } else {
            res.status(404).json({ message: "schedule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function updateSchedule(req, res) {
    try {
        const {ScheduleId} = req.body
        if(!(ScheduleId)){
            return res.status(400).send('ScheduleId is required')
         }
         const updatedBy = req.user.userId;
        const updatedSchedule = await scheduleCreation.updateSchedule(ScheduleId, req.body,updatedBy);
            res.status(200).json({message: "schedule update succesfully",updateSchedule });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function deleteSchedule(req, res) {
    try {
        const { ScheduleId } = req.query;
        if (!ScheduleId) {
            return res.status(400).json({ message: "ScheduleId is required" });
        }
        const deleted = await scheduleCreation.deleteSchedule(ScheduleId);
        if (deleted) {
            res.status(200).json({ message: `Delete successful for schedule ID ${ScheduleId}` });
        } else {
            res.status(404).json({ message: "schedule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

export async function courseAllSubject(req, res) {
    const universityId = req.user.universityId;
    try {
        const { courseId } = req.query;
        if(!courseId){
           return res.status(400).send('courseId is required')
        }
        const schedule = await scheduleCreation.courseAllSubject(courseId);
        if (schedule) {
            res.status(200).json(schedule);
        } else {
            res.status(404).json({ message: "schedule not found" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function addScheduleUnit(req, res) {
    const {semesterId,subjectId,acedmicYearId,sessionId} = req.body
    const createdBy = req.user.userId;
    const updatedBy = req.user.userId;
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    try {
        if(!(semesterId && subjectId && acedmicYearId && sessionId)){
           return res.status(400).send('semesterId,sessionId,subjectId and acedmicYearId is required')
        }
        const schedule = await scheduleCreation.addScheduleUnit(req.body,createdBy,updatedBy,universityId,instituteId);
        if(schedule){
            res.status(201).json({ message: "Data added successfully", schedule });
        }else{
            res.status(404).json({ message: "something went wrong" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export async function ScheduleUnitGet(req, res) {
    const universityId = req.user.universityId;
    const instituteId = req.user.instituteId;
    const role = req.user.role;
    const {acedmicYearId} = req.query
    try {
        const schedule = await scheduleCreation.ScheduleUnitGet(universityId,acedmicYearId,instituteId,role);
        res.status(200).json(schedule);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}