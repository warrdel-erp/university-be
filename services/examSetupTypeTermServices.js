import * as examSetupTypeTermRepository from '../repository/examSetupTypeTermRepository.js';

export async function bulkCreateExamSetupTypeTerm(data) {
    const existing = await examSetupTypeTermRepository.checkExistingExamSetupTypeTerms(data);
    if (existing && existing.length > 0) {
        throw new Error("One or more exam setup type terms already exist for the selected term and course.");
    }
    return await examSetupTypeTermRepository.bulkCreateExamSetupTypeTerm(data);
}

export async function deleteExamSetupTypeTerm(examSetupTypeTermId) {
    return await examSetupTypeTermRepository.deleteExamSetupTypeTerm(examSetupTypeTermId);
}


