import * as model from '../models/index.js';

export async function getAllUniversity(universityId) {
    try {
        const result = await model.universityModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all university details:", error);
        throw error;
    }
};

export async function getAllCampus(universityId) {
    try {
        const result = await model.campusModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all Campus details:", error);
        throw error;
    }
};

export async function getAllInstitute(universityId) {
    try {
        const result = await model.instituteModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all institute details:", error);
        throw error;
    }
};

export async function getAllAffiliatedUniversity(universityId) {
    try {
        const result = await model.affiliatedIniversityModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all Affiliated University details:", error);
        throw error;
    }
};

export async function getAllCourse(universityId) {
    try {
        const result = await model.courseModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all course details:", error);
        throw error;
    }
};

export async function getAllSpecialization(universityId) {
    try {
        const result = await model.specializationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all Specialization details:", error);
        throw error;
    }
};

export async function getAllSubject(universityId) {
    try {
        const result = await model.subjectModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all subject details:", error);
        throw error;
    }
};

// for Add

export async function addCampus(data) {
    try {
        const result = await model.campusModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in Add campus:", error);
        throw error;
    }
};

export async function addInstitute(data) {
    try {
        const result = await model.instituteModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in Add Institute:", error);
        throw error;
    }
};

export async function addAffiliatedUniversity(data) {
    try {
        const result = await model.affiliatedIniversityModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add Affiliated Universit:", error);
        throw error;
    }
};

export async function addCourse(data) {    
    try {
        const result = await model.courseModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add Course :", error);
        throw error;
    }
};

export async function addSpecialization(data) {
    try {
        const result = await model.specializationModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add specialization :", error);
        throw error;
    }
};

export async function addSubject(data) {
    try {
        const result = await model.subjectModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add subject :", error);
        throw error;
    }
};

export async function addClass(data) {
    try {
        const result = await model.classSectionModel.bulkCreate(data);
        return result;
    } catch (error) {
        console.error("Error in add class/section creation :", error);
        throw error;
    }
};

export async function getClassDetails(classSectionId,universityId) {
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userClassSection",
                    attributes:["universityId","userId"],
                    where: {
                        universityId:universityId
                    },  
                },
                {
                    model: model.courseModel,
                    as: "courseSectionAdd",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","course_levelId","universityId"] },
                },
                {
                    model: model.specializationModel,
                    as: "specializationSectionAdd",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId","course_Id","specializationId"] },
                },
            ]
        };

        if (classSectionId !== 0) {
            queryOptions.where = {
                class_sections_id: classSectionId
            };
        }

        const result = await model.classSectionModel.findAll(queryOptions);
        return result;
    } catch (error) {
        console.error("Error in getting class Details:", error);
        throw error;
    }
}

export async function addClassSubjectMapper(data) {
    try {
        const result = await model.classSubjectMapperModel.bulkCreate(data);
        return result;
    } catch (error) {
        console.error("Error in add class subject mapper :", error);
        throw error;
    }
};


export async function getClassSubjectMapper(classSectionId,universityId) {
    try {
        const queryOptions = {
            attributes: ['classSubjectMapperId'],
            include: [
                {
                    model:model.userModel,
                    as:"userClassSubjectMapper",
                    attributes:["universityId","userId"],
                    where: {
                        universityId:universityId
                    }, 
                },
                {
                    model: model.classSectionModel,
                    as: 'classSection',
                    attributes: ['section', 'acedmicPeriodId','classSectionsId'],
                    include: [
                        {
                            model: model.courseModel,
                            as: 'courseSection',
                            attributes: ['courseName',"capacity"],
                            include: [
                                {
                                    model: model.affiliatedIniversityModel,
                                    as: 'affiliated',
                                    attributes: ['affiliatedUniversityName'],
                                    include: [
                                        {
                                            model: model.instituteModel,
                                            as: 'institut',
                                            attributes: ['instituteName'],
                                            include: [
                                                {
                                                    model: model.campusModel,
                                                    as: 'campues',
                                                    attributes: ['campusName'],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                        {
                            model: model.specializationModel,
                            as: 'specializationSection',
                            attributes: ['specializationName'],
                        },
                        {
                            model: model.employeeCodeMasterType,
                            as: 'acedmicPeriods',
                            attributes: {
                                exclude: ['createdAt', 'updatedAt', 'deletedAt', 'employeeCodeMasterTypeId', 'employeeCodeMasterId', 'employee_code_master_id'],
                            },
                            include: [
                                {
                                    model: model.employeeCodeMaster,
                                    as: 'codes',
                                    attributes: { exclude: ['createdAt', 'updatedAt', 'deletedAt'] },
                                },
                            ],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: 'subjects',
                    attributes: ['subjectName','subjectId'],
                },
            ],
        };

        if (classSectionId) {
            queryOptions.where = { class_sections_id: classSectionId };
        }
        const result = await model.classSubjectMapperModel.findAll(queryOptions);

        return result;

    } catch (error) {
        console.error('Error fetching class subject mapper details:', error.message);
        throw error;
    }
}

export async function addSemester(data) {
    try {
        const result = await model.semesterModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add semester:", error);
        throw error;
    }
};

export async function getSemester(courseId, specializationId, universityId) {
    try {
        const queryConditions = {};
        
        if (courseId) {
            queryConditions.courseId = courseId;
        }
        
        if (specializationId) {
            queryConditions.specializationId = specializationId;
        }
        
        const result = await model.semesterModel.findAll({
            include: [
                {
                    model: model.userModel,
                    as: "userSemester",
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    }
                }
            ],
            where: queryConditions,
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId"] }
        });

        return result;
    } catch (error) {
        console.error(`Error in getSemester details for courseId: ${courseId}, specializationId: ${specializationId}:`, error);
        throw error;
    }
}