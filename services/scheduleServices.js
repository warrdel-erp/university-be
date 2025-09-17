import sequelize from "../database/sequelizeConfig.js";
import * as scheduleCreationRepository  from "../repository/scheduleRepository.js";

export async function addSchedule(scheduleData, createdBy, updatedBy) {
    
   try {
    const data = {
      ...scheduleData,
      createdBy,
      updatedBy
    };
    const schedule = await scheduleCreationRepository.addSchedule(data);
    return schedule;
  } catch (error) {
    throw new Error(error.message);
  }

};

export async function getScheduleDetails(universityId,acedmicYearId,instituteId,role) {
    return await scheduleCreationRepository.getScheduleDetails(universityId,acedmicYearId,instituteId,role);
};

export async function getSingleScheduleDetails(ScheduleId,universityId) {
    return await scheduleCreationRepository.getSingleScheduleDetails(ScheduleId,universityId);
};

export async function deleteSchedule(ScheduleId) {
    return await scheduleCreationRepository.deleteSchedule(ScheduleId);
};

export async function updateSchedule(ScheduleId, ScheduleData, updatedBy) {    

    ScheduleData.updatedBy = updatedBy;
    await scheduleCreationRepository.updateSchedule(ScheduleId, ScheduleData);
};

export async function courseAllSubject(courseId) {
    return await scheduleCreationRepository.courseAllSubject(courseId);
};

export async function addScheduleUnit(data, createdBy, updatedBy, universityId, instituteId) {
  const { acedmicYearId, semesterId, subjectId, slab,sessionId } = data;
  const ScheduleUnits = slab.map((unit) => ({
    universityId,
    instituteId,
    sessionId,
    acedmicYearId,
    semesterId,
    subjectId,
    unitNumber: unit.unitNumber,
    name: unit.name,
    description: unit.description,
    contactHours: unit.contactHours,
    createdBy,
    updatedBy
  }));

  return await scheduleCreationRepository.addScheduleUnit(ScheduleUnits);
};

export async function ScheduleUnitGet(universityId, acedmicYearId, instituteId, role) {
  const ScheduleUnits = await scheduleCreationRepository.ScheduleUnitGet(
    universityId,
    acedmicYearId,
    instituteId,
    role
  );

  return ScheduleUnits.map(unit => ({
    ScheduleUnitId: unit.ScheduleUnitId,
    universityId: unit.universityId,
    instituteId: unit.instituteId,
    instituteName: unit.instituteUnit?.instituteName || null,
    instituteCode: unit.instituteUnit?.instituteCode || null,
    acedmicYearId: unit.acedmicYearId,
    acedmicYearTitle: unit.acedmicYearUnit?.yearTitle || null,
    acedmicYearStart: unit.acedmicYearUnit?.startingDate || null,
    acedmicYearEnd: unit.acedmicYearUnit?.endingDate || null,
    semesterId: unit.semesterId,
    name:unit.semesterUnit?.name,
    sessionId: unit.sessionId,
    sessionName: unit.sessionUnit?.sessionName || null,
    subjectId: unit.subjectId,
    subjectName: unit.subjectUnit?.subjectName || null,
    subjectCode: unit.subjectUnit?.subjectCode || null,
    unitNumber: unit.unitNumber,
    name: unit.name,
    description: unit.description,
    contactHours: unit.contactHours
  }));
};