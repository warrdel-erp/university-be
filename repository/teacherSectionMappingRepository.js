import * as model from '../models/index.js'

export async function teacherSectionMapping(data) {    
    try {
        const result = await model.teacherSectionMappingModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in student mapping course:", error);
        throw error;
    }
};

export async function getTeacherSectionMapping(employeeId, universityId, acedmicYearId, instituteId, role, sessionId) {
    try {
        const academicInstituteFilter = {
            ...(acedmicYearId && { acedmicYearId }),
            ...(instituteId && { instituteId }),
            ...(sessionId && { sessionId }),
        };

        const courseWhere = {
            universityId,
            ...(instituteId && { instituteId }),
        };

        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: employeeId ? { employeeId } : undefined,
            include: [
                {
                    model: model.userModel,
                    as: "userTeacherSectionMapping",
                    attributes: ["universityId", "userId"],
                    where: { universityId },
                    required: true,
                },
                {
                    model: model.employeeModel,
                    as: "employeeData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: academicInstituteFilter,
                    required: true,
                    include: [
                        {
                            model: model.campusModel,
                            as: "employeeCampus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "campusId", "campusCode"] },
                            where: { universityId },
                            required: true,
                        },
                        {
                            model: model.instituteModel,
                            as: "employeeInstitute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "campusId", "instituteCode"] },
                            ...(instituteId && {
                                where: { instituteId },
                                required: true,
                            }),
                        },
                    ],
                },
                {
                    model: model.classSectionModel,
                    as: "employeeSection",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: academicInstituteFilter,
                    required: true,
                    include: [
                        {
                            model: model.courseModel,
                            as: "employeeCourse",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                            where: courseWhere,
                            required: true,
                        },
                        {
                            model: model.sessionModel,
                            as: "classSession",
                            attributes: ["sessionId", "sessionName", "startingDate", "endingDate", "classTillDate"],
                            required: false,
                        },
                    ],
                },
            ],
        };

        const result = await model.teacherSectionMappingModel.findAll(queryOptions);
        return result;
    } catch (error) {
        console.error(`Error in getting employee code and types${employeeId}:`, error);
        throw error;
    }
};

export async function updateTeachersSectionMapping(teacherSectionMappingId, info) {
    try {
        const result = await model.teacherSectionMappingModel.update(info, {
            where: {
                teacherSectionMappingId: teacherSectionMappingId
            }
        });
     return result; 
    } catch (error) {
        console.error(`Error updating teacher subject mapping ${teacherSectionMappingId} :`, error);
        throw error; 
    }
};

export async function deleteTeachersSectionMapping (teacherSectionMappingId) {
    try {
        const result = await model.teacherSectionMappingModel.destroy({
            where: { teacherSectionMappingId },
            individualHooks: true
        });
        return { message: 'delete Teacher Section Mapping deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};