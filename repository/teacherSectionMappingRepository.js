import * as model from '../models/index.js'
import { buildScope } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

export async function teacherSectionMapping(data) {
    try {
        return await model.teacherSectionMappingModel.create(data);
    } catch (error) {
        console.error('Error in student mapping course:', error);
        throw error;
    }
}

export async function getTeacherSectionMapping(employeeId) {
    try {
        const universityId = requestContext.getStore()?.universityId;
        const employeeWhere = buildScope(model.employeeModel);
        const classSectionWhere = buildScope(model.classSectionModel);
        const courseWhere = buildScope(model.courseModel);

        return await model.teacherSectionMappingModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            ...(employeeId && { where: { employeeId } }),
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: 'userTeacherSectionMapping',
                    attributes: ['universityId', 'userId'],
                    where: { universityId },
                    required: true,
                },
                {
                    model: model.employeeModel.unscoped(),
                    as: 'employeeData',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: employeeWhere,
                    required: true,
                    include: [
                        {
                            model: model.campusModel.unscoped(),
                            as: 'employeeCampus',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'campusCode'] },
                            where: { universityId },
                            required: true,
                        },
                        {
                            model: model.instituteModel.unscoped(),
                            as: 'employeeInstitute',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'campusId', 'instituteCode'] },
                        },
                    ],
                },
                {
                    model: model.classSectionModel.unscoped(),
                    as: 'employeeSection',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: classSectionWhere,
                    required: true,
                    include: [
                        {
                            model: model.courseModel.unscoped(),
                            as: 'employeeCourse',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                            where: courseWhere,
                            required: true,
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        console.error(`Error in getting employee code and types ${employeeId}:`, error);
        throw error;
    }
}

export async function updateTeachersSectionMapping(teacherSectionMappingId, info) {
    try {
        return await model.teacherSectionMappingModel.update(info, {
            where: { teacherSectionMappingId },
        });
    } catch (error) {
        console.error(`Error updating teacher subject mapping ${teacherSectionMappingId} :`, error);
        throw error;
    }
}

export async function deleteTeachersSectionMapping(teacherSectionMappingId) {
    try {
        await model.teacherSectionMappingModel.destroy({
            where: { teacherSectionMappingId },
            individualHooks: true,
        });
        return { message: 'delete Teacher Section Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
}
