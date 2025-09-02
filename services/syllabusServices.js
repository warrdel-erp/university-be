import sequelize from "../database/sequelizeConfig.js";
import * as SyllabusCreationRepository  from "../repository/syllabusRepository.js";
import * as mainRepository from '../repository/mainRepository.js';

// export async function addSyllabus(syllabusData, createdBy, updatedBy) {
//     const transaction = await sequelize.transaction();
//     try {
//         const classId = syllabusData.classId;
//         const classSection = await mainRepository.getSectionByClassId(classId);
//         const classSectionIds = [];
//         for (let i = 0; i < classSection.length; i++) {
//             classSectionIds.push(classSection[i].classSectionsId);
//         }

//         const allSyllabusResults = [];

//         for (const sectionId of classSectionIds) {
//             const syllabus = await SyllabusCreationRepository.addSyllabus({
//                 instituteId: syllabusData.instituteId,
//                 acedmicYearId: syllabusData.acedmicYearId,
//                 courseId: syllabusData.courseId,
//                 classSectionsId: sectionId,
//                 createdBy,
//                 updatedBy
//             }, { transaction });

//             const syllabusDetailsData = [];

//             for (const subjectGroup of syllabusData.subjects) {
//                 const { subjectType, type, internal, external, total, data } = subjectGroup;

//                 for (const subj of data) {
//                     syllabusDetailsData.push({
//                         syllabusId: syllabus.syllabusId,
//                         subjectId: subj.subjectId,
//                         subjectType,
//                         type,
//                         internal,
//                         external,
//                         total,
//                         createdBy,
//                         updatedBy
//                     });
//                 }
//             }

//             await SyllabusCreationRepository.addSyllabusDetails(syllabusDetailsData, { transaction });
//             allSyllabusResults.push(syllabus);
//         }

//         await transaction.commit();

//         return allSyllabusResults;
//     } catch (error) {
//         await transaction.rollback();
//         console.error('Error creating syllabus:', error);
//         throw error;
//     }
// };

export async function addSyllabus(syllabusData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const allSyllabusResults = [];

        const syllabus = await SyllabusCreationRepository.addSyllabus({
            instituteId: syllabusData.instituteId,
            acedmicYearId: syllabusData.acedmicYearId,
            courseId: syllabusData.courseId,
            createdBy,
            updatedBy
        }, { transaction });

        const syllabusDetailsData = [];

        // Add subjects and details
        for (const subjectGroup of syllabusData.subjects) {
            const { subjectType, type, mid_term, end_term, total, data } = subjectGroup;

            for (const subj of data) {
                syllabusDetailsData.push({
                    syllabusId: syllabus.syllabusId,
                    subjectId: subj.subjectId,
                    subjectType,
                    type,
                    internal: mid_term,  
                    external: end_term,  
                    total,
                    createdBy,
                    updatedBy
                });
            }
        }

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

export async function courseAllSubject(courseId) {
    return await SyllabusCreationRepository.courseAllSubject(courseId);
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
}
