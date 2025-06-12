import * as model from '../models/index.js'

export async function addCo(coData) {
    try {
        const result = await model.coModel.create(coData);
        return result;
    } catch (error) {
        console.error("Error in add co :", error);
        throw error;
    }
};

export async function getAllCo(universityId, instituteId, role, acedmicYearId) {
    try {
        const whereClause = {
            ...(universityId && { universityId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const co = await model.coModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: whereClause,
            include: [
                {
                    model: model.syllabusDetailsModel,
                    as: "cosyllabus",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    include: [
                        {
                            model: model.subjectModel,
                            as: 'syllabusSubject',
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
                            },
                        }
                    ]
                },
            ]
        });

        return co;
    } catch (error) {
        console.error('Error fetching co details all:', error);
        throw error;
    }
}

export async function getSingleCoDetails(coId) {
    try {
        const Po = await model.coModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { coId },
            include: [
                {
                    model: model.syllabusDetailsModel,
                    as: "cosyllabus",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    include: [
                        {
                            model: model.subjectModel,
                            as: 'syllabusSubject',
                            attributes: {
                                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
                            },
                        }
                    ]
                },
            ]
        });

        return Po;
    } catch (error) {
        console.error('Error fetching co details:', error);
        throw error;
    }
}

export async function updateCo(coId, poData) {
    try {
        const result = await model.coModel.update(poData, {
            where: { coId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating co creation ${coId}:`, error);
        throw error;
    }
}

export async function deleteCo(coId) {
    const deleted = await model.coModel.destroy({ where: { coId: coId } });
    return deleted > 0;
}

export async function addCoWeightage(coData) {
    try {
        const result = await model.coWeightageModel.bulkCreate(coData);
        return result;
    } catch (error) {
        console.error("Error in add weightage :", error);
        throw error;
    }
};

export async function getAllCoWeightage(universityId, instituteId, role, acedmicYearId) {
    try {
        const whereClause = {
            ...(universityId && { universityId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const co = await model.coWeightageModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy","universityId","instituteId"] },
            where: whereClause,
            include: [
                {
                    model: model.coModel,
                    as: "codetail",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy","universityId","instituteId"] },
                    include: [
                        {
                            model: model.syllabusDetailsModel,
                            as: "cosyllabus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'syllabusSubject',
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy","universityId","instituteId"]
                                    },
                                }
                            ]
                        },
                    ]
                },
            ]
        });

        return co;
    } catch (error) {
        console.error('Error fetching co weightage all:', error);
        throw error;
    }
}

export async function getSingleCoDetailsWeightage(coId) {
    try {
        const Po = await model.coWeightageModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { coId },
            include: [
                {
                    model: model.coModel,
                    as: "codetail",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    include: [
                        {
                            model: model.syllabusDetailsModel,
                            as: "cosyllabus",
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                            include: [
                                {
                                    model: model.subjectModel,
                                    as: 'syllabusSubject',
                                    attributes: {
                                        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
                                    },
                                }
                            ]
                        },
                    ]
                },
            ]
        });

        return Po;
    } catch (error) {
        console.error('Error fetching co weightage:', error);
        throw error;
    }
}

export async function updateCoWeightage(coWeightageId, poData) {
    try {
        const result = await model.coModel.updateCoWeightage(poData, {
            where: { coWeightageId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating co weightage ${coWeightageId}:`, error);
        throw error;
    }
}