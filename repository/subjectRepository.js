import * as model from '../models/index.js';

export async function getAllSubjects(universityId, acedmicYearId, campusId, instituteId, courseId) {
    try {
        const whereClause = {
            universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
            ...(campusId && { campusId }),
            ...(courseId && { courseId }),
        };

        const result = await model.subjectModel.findAll({
            where: whereClause,
            include: [
                {
                    model: model.courseModel,
                    as: 'courseInfo',
                    attributes: ['courseId', 'courseName']
                }
            ]
        });
        return result;
    } catch (error) {
        console.error("Error in getAllSubjects repository:", error);
        throw error;
    }
}
