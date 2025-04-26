import sequelize from "../database/sequelizeConfig.js";
import * as SyllabusCreationRepository  from "../repository/syllabusRepository.js";

export async function addSyllabus(syllabusData, createdBy, updatedBy) {
    console.log(`>>>>>>syllabusData, createdBy, updatedBy>>>>>.`, JSON.stringify(syllabusData), createdBy, updatedBy);

    const transaction = await sequelize.transaction();
    try {
        const syllabus = await SyllabusCreationRepository.addSyllabus({
            instituteId: syllabusData.instituteId,
            acedmicYearId: syllabusData.acedmicYearId,
            courseId: syllabusData.courseId,
            classSectionsId: syllabusData.classSectionsId,
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

        await transaction.commit();

        return syllabus;
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating syllabus:', error);
        throw error;
    }
}


export async function getSyllabusDetails(universityId) {
    return await SyllabusCreationRepository.getSyllabusDetails(universityId);
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