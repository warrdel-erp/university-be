import { SuccessResponse, ErrorResponse } from '../utility/response.js';
import * as models from '../models/index.js';
import { scoped } from '../utility/scoped.js';

export const getBatches = async (req, res) => {
    try {
        const instituteId = req.instituteId;
        
        // Fetch mapped curriculums with course details
        const mappings = await scoped(models.curriculumBatchMappingModel).findAll({
            include: [{ 
                model: models.curriculumModel, 
                as: 'curriculum',
                include: [{ model: models.courseModel, as: 'course' }]
            }]
        });

        const data = mappings.map(m => ({
            id: m.curriculumBatchMappingId,
            courseId: m.curriculum?.courseId,
            programme: m.curriculum?.course?.courseName || 'N/A',
            batch: m.batch,
            students: 0, // This would normally come from a count of students in this batch
            curriculum: m.curriculum?.name,
            curriculumId: m.curriculumId,
            structure: 'Configured',
            status: 'Configured'
        }));

        return SuccessResponse(res, 200, 'Batches retrieved successfully', data);
    } catch (error) {
        console.error(error);
        return ErrorResponse(res, error.statusCode || 500, error.message || 'Internal Server Error');
    }
};
