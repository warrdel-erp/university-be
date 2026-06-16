import * as model from '../models/index.js'
import { buildScope } from '../utility/scoped.js';
import { requestContext } from '../utility/requestContext.js';

export async function teacherSubjectMapping(data) {
    try {
        return await model.teacherSubjectMappingModel.create(data);
    } catch (error) {
        console.error('Error in teacher Subject Mapping:', error);
        throw error;
    }
}

export async function getTeacherSubjectMapping(employeeId) {
    try {
        const universityId = requestContext.getStore()?.universityId;
        const employeeWhere = buildScope(model.employeeModel);
        const mapperWhere = buildScope(model.classSubjectMapperModel);
        const semesterWhere = buildScope(model.semesterModel);
        const subjectWhere = buildScope(model.subjectModel);
        const classSectionWhere = buildScope(model.classSectionModel);

        return await model.teacherSubjectMappingModel.findAll({
            ...(employeeId && { where: { employeeId } }),
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            include: [
                {
                    model: model.userModel.unscoped(),
                    as: 'userTeacherSubjectMapping',
                    attributes: ['universityId', 'userId'],
                    where: { universityId },
                    required: true,
                },
                {
                    model: model.employeeModel.unscoped(),
                    as: 'teacherEmployeeData',
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
                        {
                            model: model.acedmicYearModel.unscoped(),
                            as: 'acedmicYear',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                        },
                    ],
                },
                {
                    model: model.classSubjectMapperModel.unscoped(),
                    as: 'employeeSubject',
                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                    where: mapperWhere,
                    required: true,
                    include: [
                        {
                            model: model.semesterModel.unscoped(),
                            as: 'employeeClassSection',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                            where: semesterWhere,
                            required: true,
                            include: [
                                {
                                    model: model.classSectionModel.unscoped(),
                                    as: 'classSections',
                                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                                    where: classSectionWhere,
                                    required: true,
                                },
                            ],
                        },
                        {
                            model: model.subjectModel.unscoped(),
                            as: 'subjects',
                            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt', 'createdBy', 'updatedBy'] },
                            where: subjectWhere,
                            required: true,
                        },
                    ],
                },
            ],
        });
    } catch (error) {
        throw new Error(`Failed to fetch teacher subject mapping: ${error.message}`);
    }
}

export async function updateTeachersSubjectMapping(teacherSubjectMappingId, info) {
    try {
        return await model.teacherSubjectMappingModel.update(info, {
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error updating teacher subject mapping details ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}

export async function deleteTeachersSubjectMapping(teacherSubjectMappingId) {
    try {
        await model.teacherSubjectMappingModel.destroy({
            where: { teacherSubjectMappingId },
            individualHooks: true,
        });
        return { message: 'teacher Subject Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
}

export async function getTeacherDetailsByTeacherSubjectId(teacherSubjectMappingId) {
    try {
        return await model.teacherSubjectMappingModel.findAll({
            attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
            where: { teacherSubjectMappingId },
        });
    } catch (error) {
        console.error(`Error in getting teacher details by teacher subject mapper id ${teacherSubjectMappingId}:`, error);
        throw error;
    }
}
