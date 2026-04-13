import * as examSetupTypeRepository from '../repository/examSetupTypeRepository.js';

export async function getExamSetupTypes(filters) {
    return await examSetupTypeRepository.getExamSetupTypes(filters);
}
