import sequelize from "../database/sequelizeConfig.js";
import * as SyllabusCreationRepository  from "../repository/syllabusRepository.js";

export async function addSyllabus(syllabusData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const allSyllabusResults = [];

        const syllabus = await SyllabusCreationRepository.addSyllabus({
            instituteId: syllabusData.instituteId,
            acedmicYearId: syllabusData.acedmicYearId,
            courseId: syllabusData.courseId,
            sessionId:syllabusData.sessionId,
            createdBy,
            updatedBy
        }, { transaction });

        const syllabusDetailsData = [];

        syllabusData.subjects.forEach(subj => {
            subj.term.forEach(termItem => {
                syllabusDetailsData.push({
                    syllabusId: syllabus.syllabusId,
                    subjectId: subj.subjectId,
                    subjectType: subj.subjectType,
                    examSetupTypeId: termItem.examSetupTypeId,
                    type: termItem.type,
                    marks: termItem.marks,
                    total: subj.total,   
                    createdBy,
                    updatedBy
                });
            });
        });

        await SyllabusCreationRepository.addSyllabusDetails(syllabusDetailsData, { transaction });
        allSyllabusResults.push(syllabus);

        await transaction.commit();
        return allSyllabusResults;
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating syllabus:', error);
        throw error;
    }
};

export async function getSyllabusDetails(universityId,acedmicYearId,instituteId,role) {
    return await SyllabusCreationRepository.getSyllabusDetails(universityId,acedmicYearId,instituteId,role);
};

export async function getSingleSyllabusDetails(SyllabusId,universityId) {
    return await SyllabusCreationRepository.getSingleSyllabusDetails(SyllabusId,universityId);
};

export async function deleteSyllabus(SyllabusId) {
    return await SyllabusCreationRepository.deleteSyllabus(SyllabusId);
};

export async function updateSyllabus(SyllabusId, syllabusData, updatedBy) {    

    syllabusData.updatedBy = updatedBy;
    await SyllabusCreationRepository.updateSyllabus(SyllabusId, syllabusData);
};

export async function courseAllSubject(courseId,sessionId,universityId) {
    return await SyllabusCreationRepository.courseAllSubject(courseId,sessionId,universityId);
};

export async function addSyllabusUnit(data, createdBy, updatedBy, universityId, instituteId) {
  const { acedmicYearId, semesterId, subjectId, slab,sessionId } = data;
  const syllabusUnits = slab.map((unit) => ({
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

  return await SyllabusCreationRepository.addSyllabusUnit(syllabusUnits);
};

export async function syllabusUnitGet(universityId, acedmicYearId, instituteId, role) {
  const syllabusUnits = await SyllabusCreationRepository.syllabusUnitGet(
    universityId,
    acedmicYearId,
    instituteId,
    role
  );

  return syllabusUnits.map(unit => ({
    syllabusUnitId: unit.syllabusUnitId,
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