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

export async function getAllCampus(universityId,campusId) {
    try {

        const whereClause = {
            university_id: universityId,
            ...(campusId && { campusId })  
        };
        const result = await model.campusModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: whereClause,
        });
        return result;
    } catch (error) {
        console.error("Error in get all Campus details:", error);
        throw error;
    }
};

export async function getAllInstitute(universityId,instituteId,headInstituteId,role) {
    try {
        const whereClause = {
            university_id: universityId,
            ...(instituteId && { institute_id:instituteId }),
            ...(role === 'Head' && { institute_id: headInstituteId })
        };
        const result = await model.instituteModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: whereClause,
        });
        return result;
    } catch (error) {
        console.error("Error in get all institute details:", error);
        throw error;
    }
};

export async function getAllAffiliatedUniversity(universityId,instituteId,headInstituteId,role) {
    try {
        const whereClause = {
            university_id: universityId,
            ...(instituteId && { institute_id: instituteId }),
            ...(role === 'Head' && { institute_id: headInstituteId })
        };
        const result = await model.affiliatedIniversityModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: whereClause,
        });
        return result;
    } catch (error) {
        console.error("Error in get all Affiliated University details:", error);
        throw error;
    }
};

export async function getAllCourse(universityId,acedmicYearId,instituteId,role) {
    try {
        const whereClause = {
            university_id: universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const result = await model.courseModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: whereClause,
        });
        return result;
    } catch (error) {
        console.error("Error in get all course details:", error);
        throw error;
    }
};

export async function getAllSpecialization(universityId,acedmicYearId,instituteId,role) {
    try {
        const whereClause = {
            university_id: universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const result = await model.specializationModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: whereClause,
        });
        return result;
    } catch (error) {
        console.error("Error in get all Specialization details:", error);
        throw error;
    }
};

export async function getAllSubject(universityId,acedmicYearId,instituteId,role) {
    console.log(`>>>>>>>>>>>>>universityId,acedmicYearId,instituteId`,universityId,acedmicYearId,instituteId);
    
    try {
        const whereClause = {
            university_id: universityId,
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const result = await model.subjectModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: whereClause,
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

export async function addCourse(data, transaction) {
    try {
        return await model.courseModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add Course:", error);
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

// addClass and createClass function are same but addClass function add automatic according to semester
//  but createClass function add section manually

export async function createClass(data) {    
    try {
        const result = await model.classSectionModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add class directly :", error);
        throw error;
    }
};

export async function seprateAddClass(data) {        
    try {
        const result = await model.classModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add class seprate :", error);
        throw error;
    }
};

export async function getClassDetails(classSectionsId, universityId, acedmicYearId,instituteId,role) {
    console.log(`>>>>>>>>>classSectionsId`,classSectionsId);
        console.log(`>>>>>>>>>acedmicYearId`,acedmicYearId);
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.userModel,
                    as: "userClassSection",
                    attributes: ["universityId", "userId"],
                    where: {
                        universityId: universityId
                    }
                },
                {
                    model: model.courseModel,
                    as: "courseSectionAdd",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "course_levelId", "universityId"] },
                    // where :{
                    //     ...(acedmicYearId && {acedmicYearId})
                    // }
                },
                {
                    model: model.specializationModel,
                    as: "specializationSectionAdd",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "universityId", "course_Id", "specializationId"] }
                }
            ],
            where: {}
        };

        if (classSectionsId !== 0) {
            queryOptions.where.classSectionsId = classSectionsId;
        }

        if (acedmicYearId) {
            queryOptions.where.acedmicYearId = acedmicYearId;
        }

        if (role === 'Head') {
            queryOptions.where.instituteId = instituteId;
        }

        const result = await model.classSectionModel.findAll(queryOptions);
        return result;
    } catch (error) {
        console.error("Error in getting class Details:", error);
        throw error;
    }
};

export async function addClassSubjectMapper(data) {
    try {
        const result = await model.classSubjectMapperModel.bulkCreate(data);
        return result;
    } catch (error) {
        console.error("Error in add class subject mapper :", error);
        throw error;
    }
};

export async function getClassSubjectMapper(classSectionId,universityId,acedmicYearId,instituteId,role) {
    try {
        const queryOptions = {
            attributes: ['classSubjectMapperId'],
            where: {
                ...(classSectionId && { class_sections_id: classSectionId }),
                ...(role === 'Head' && { instituteId })
            },
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

                    attributes: ['section', 'acedmicYearId','classSectionsId'],
                    where: acedmicYearId ? { acedmicYearId } : undefined,
                       attributes: ['section', 'acedmicYearId','classSectionsId'],
                    include: [
                        {
                            model :model.classModel,
                            as :'classGroup',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                        {
                            model: model.courseModel,
                            as: 'courseSection',
                            attributes: ['courseName',"capacity",'courseId'],
                            include: [
                                {
                                    model: model.affiliatedIniversityModel,
                                    as: 'affiliated',
                                    attributes: ['affiliatedUniversityName'],
                                    include: [
                                        {
                                            model: model.instituteModel,
                                            as: 'institut',
                                            attributes: ['instituteName','instituteId'],
                                            include: [
                                                {
                                                    model: model.campusModel,
                                                    as: 'campues',
                                                    attributes: ['campusName','campusId'],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    model: model.acedmicYearModel,
                                    as: 'courseacedmicYear',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                                    where: acedmicYearId ? { acedmicYearId } : undefined
                                },
                            ],
                        },
                        {
                            model: model.acedmicYearModel,
                            as: 'acedmicYearSection',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                        },
                        {
                            model: model.specializationModel,
                            as: 'specializationSection',
                            attributes: ['specializationName'],
                        },
                    ],
                },
                {
                    model: model.subjectModel,
                    as: 'subjects',
                    attributes: ['subjectName', 'subjectId', 'subjectType', 'subjectCode'],
                    where: acedmicYearId ? { acedmicYearId } : undefined

                },
            ],
        };

        // if (classSectionId) {
        //     queryOptions.where = { class_sections_id: classSectionId };
        // };
        const result = await model.classSubjectMapperModel.findAll(queryOptions);

        return result;

    } catch (error) {
        console.error('Error fetching class subject mapper details:', error.message);
        throw error;
    }
};

export async function addSemester(data, transaction) {
    try {
        return await model.semesterModel.create(data, { transaction });
    } catch (error) {
        console.error("Error in add semester:", error);
        throw error;
    }
};

export async function getSemester(courseId, specializationId, universityId,acedmicYearId,instituteId,role) {

    try {
        const queryConditions = {
            ...(acedmicYearId && {acedmicYearId}),
            ...(courseId && {courseId}),
            ...(specializationId && {specializationId}),
            ...(role === 'Head' && { institute_id: instituteId })
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
        console.error(`Error in getSemester details for courseId: ${courseId}, specializationId: ${specializationId} and acedmicYearId :${acedmicYearId}:`, error);
        throw error;
    }
};

export async function getSectionByClassId(classId) {
    try {
        const result = await model.classSectionModel.findAll({
            where: {
                classId: classId
            }
        });
        return result;
    } catch (error) {
        console.error("Error in getting class section by class Id:", error);
        throw error;
    }
};
