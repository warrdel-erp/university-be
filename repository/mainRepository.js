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

export async function getClassDetails(classSectionId) {
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
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
                // {
                //     model: model.employeeCodeMasterType,
                //     as: "acedmicPeriod",
                //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt",,"employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id"] },
                //     include :[
                //         {
                //             model: model.employeeCodeMaster,
                //             as: "codes",
                //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                //         },
                //     ]
                // }
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

export async function getClassSubjectMapper(classSectionId) {
    try {
        const queryOptions = {
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
            include: [
                {
                    model: model.classSubjectMapperModel,
                    as: "classSection",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","classSectionsId","specializationId","acedmicPeriodId"] },
                    include: [
                        {
                            model: model.courseModel,
                            as: "courseSection",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","course_levelId","universityId"] },
                            include :[
                                {
                                    model: model.affiliatedIniversityModel,
                                    as: "affiliated",
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                        include:[
                                            {
                                                model: model.instituteModel,
                                                as: "institut",
                                                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                include:[
                                                    {
                                                        model: model.campusModel,
                                                        as :"campues",
                                                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                                                    }
                                                ]
                                            },
                                        ]
                                },
                            ]
                        },
                        {
                            model: model.specializationModel,
                            as: "specializationSection",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId","course_Id","specializationId"] },
                        },
                    ]
                },
                // {
                //     model: model.employeeCodeMasterType,
                //     as: "semester",
                //     attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","employeeCodeMasterTypeId","employeeCodeMasterId","employee_code_master_id"] },
                //     include :[
                //         {
                //             model: model.employeeCodeMaster,
                //             as: "codes",
                //             attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                //         },
                //     ]
                // },
                {
                    model: model.subjectModel,
                    as: "subjects",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
                },
            ]
        };

        if (classSectionId !== 0) {
            queryOptions.where = {
                class_sections_id: classSectionId,
            };
        }

        const result = await model.classSectionModel.findAll(queryOptions);
        return result;
    } catch (error) {
        console.error("Error in getting class subject mapper Details:", error);
        throw error;
    }
}