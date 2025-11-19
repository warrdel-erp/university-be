import * as model from '../models/index.js'

export async function getCourseCode(courseId) {
    try {
        const attribute = ["course_code"]
        const result = await model.courseModel.findOne({
            attributes:attribute,
            where: {
                course_id: courseId
            },
        });
        return result;
    } catch (error) {
        console.error(`Error in course code${courseId}:`, error);
        throw error;
    };
};

export async function getCampusCode(campusId) {
    try {
        const attribute = ["campus_code"]
        const result = await model.campusModel.findOne({
            attributes:attribute,
            where: {
                campus_id: courseId
            },
        });
        return result;
    } catch (error) {
        console.error(`Error in campus code${campusId}:`, error);
        throw error;
    };
};

export async function getInstituteCode(instituteId) {
    try {
        const attribute = ["institute_code"]
        const result = await model.instituteModel.findOne({
            attributes:attribute,
            where: {
                institute_id: instituteId
            },
        });
        return result;
    } catch (error) {
        console.error(`Error in institute code${instituteId}:`, error);
        throw error;
    };
};