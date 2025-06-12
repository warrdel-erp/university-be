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

export async function getTeacherSectionMapping(employeeId, universityId, acedmicYearId,instituteId,role) {    
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userTeacherSectionMapping",
                    attributes: ["universityId", "userId"],
                    where: { universityId: universityId }
                },
                {
                    model: model.employeeModel,
                    as: "employeeData",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    // where: acedmicYearId ? { acedmicYearId } : undefined,
                    where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId })
                    },

                    include: [
                        {
                            model: model.campusModel,
                            as: "employeeCampus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "campusId", "campusCode"] }
                        },
                        {
                            model: model.instituteModel,
                            as: "employeeInstitute",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "instituteId", "campusId", "instituteCode"] }
                        }
                    ]
                },
                {
                    model: model.classSectionModel,
                    as: "employeeSection",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                    where: {
                        ...(acedmicYearId && { acedmicYearId }),
                        ...(role === 'Head' && { instituteId })
                    },
                    include: [
                        {
                            model: model.courseModel,
                            as: "employeeCourse",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
                        }
                    ]
                }
            ],
            where: employeeId ? { employeeId } : undefined
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