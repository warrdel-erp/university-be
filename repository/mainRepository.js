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

export async function getAllCourseLevel(universityId) {
    try {
        const result = await model.courseLevelModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","universityId"] },
            where: {
                university_id: universityId
            },
        });
        return result;
    } catch (error) {
        console.error("Error in get all Course Level details:", error);
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

export async function addCourseLevel(data) {
    try {
        const result = await model.courseLevelModel.create(data);
        return result;
    } catch (error) {
        console.error("Error in add Course Level:", error);
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