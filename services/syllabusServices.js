import sequelize from "../database/sequelizeConfig.js";
import * as SyllabusCreationRepository  from "../repository/syllabusRepository.js";
import * as mainRepository from '../repository/mainRepository.js';

export async function addSyllabus(syllabusData, createdBy, updatedBy) {
    const transaction = await sequelize.transaction();
    try {
        const classId = syllabusData.classId;
        const classSection = await mainRepository.getSectionByClassId(classId);
        const classSectionIds = [];
        for (let i = 0; i < classSection.length; i++) {
            classSectionIds.push(classSection[i].classSectionsId);
        }

        const allSyllabusResults = [];

        for (const sectionId of classSectionIds) {
            const syllabus = await SyllabusCreationRepository.addSyllabus({
                instituteId: syllabusData.instituteId,
                acedmicYearId: syllabusData.acedmicYearId,
                courseId: syllabusData.courseId,
                classSectionsId: sectionId,
                createdBy,
                updatedBy
            }, { transaction });

            const syllabusDetailsData = [];

            for (const subjectGroup of syllabusData.subjects) {
                const { subjectType, type, mid_term, end_term, total, data } = subjectGroup;

                for (const subj of data) {
                    syllabusDetailsData.push({
                        syllabusId: syllabus.syllabusId,
                        subjectId: subj.subjectId,
                        subjectType,
                        type,
                        midTerm: mid_term,
                        endTerm: end_term,
                        total,
                        createdBy,
                        updatedBy
                    });
                }
            }

            await SyllabusCreationRepository.addSyllabusDetails(syllabusDetailsData, { transaction });
            allSyllabusResults.push(syllabus);
        }

        await transaction.commit();

        return allSyllabusResults;
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating syllabus:', error);
        throw error;
    }
};

export async function getSyllabusDetails(universityId,acedmicYearId) {
    return await SyllabusCreationRepository.getSyllabusDetails(universityId,acedmicYearId);
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