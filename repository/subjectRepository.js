import * as model from '../models/index.js';

export async function getSubjectTiny(universityId, acedmicYearId, campusId, instituteId) {
    try {
        const whereClause = {
            universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
            ...(campusId && { campusId }),
        };

        const result = await model.subjectModel.findAll({
            attributes: ['subjectId', 'subjectCode'],
            where: whereClause,
            raw: true,
        });
        return result;
    } catch (error) {
        console.error("Error in get subject tiny data:", error);
        throw error;
    }
};

export async function getAllSubjects(universityId, acedmicYearId, campusId, instituteId) {
    try {
        const whereClause = {
            universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
            ...(campusId && { campusId }),
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
