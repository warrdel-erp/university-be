import * as model from '../models/index.js'

export async function addFeePlan(data,transaction) {    
    try {
        const result = await model.feePlanModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Fee Plan :", error);
        throw error;
    }
};

export async function addFeePlanType(data,transaction) {    
    try {
        const result = await model.feePlanTypeModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Fee Plan type :", error);
        throw error;
    }
};

export async function addFeePlanSemester(data,transaction) {    
    try {
        const result = await model.feePlanSemesterModel.create(data, { transaction });
        return result;
    } catch (error) {
        console.error("Error in add Fee Plan semester:", error);
        throw error;
    }
};


export async function getFeePlanDetails(universityId,instituteId,role,acedmicYearId) {
    try {
        const whereClause = {
            // ...(universityId && { universityId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const FeePlan = await model.feePlanModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:whereClause,
            include:[
                {
                    model: model.feePlanTypeModel,
                    as: "feePlanType",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.feeTypeModel,
                            as:'feeType',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
                {
                    model:model.feePlanSemesterModel,
                    as:'feePlanSemester',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include :[
                        {
                            model:model.semesterModel,
                            as:'Semester',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                            include:[
                                {
                                    model:model.courseModel,
                                    as:'semesterCourse',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        return FeePlan;
    } catch (error) {
        console.error('Error fetching FeePlan details:', error);
        throw error;
    }
}

export async function getSingleFeePlanDetails(feePlanId) {
     try {
        const FeePlan = await model.feePlanModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:{
                feePlanId
            },
            include:[
                {
                    model: model.feePlanTypeModel,
                    as: "feePlanType",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.feeTypeModel,
                            as:'feeType',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
                {
                    model:model.feePlanSemesterModel,
                    as:'feePlanSemester',
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include :[
                        {
                            model:model.semesterModel,
                            as:'Semester',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                            include:[
                                {
                                    model:model.courseModel,
                                    as:'semesterCourse',
                                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        return FeePlan;
    } catch (error) {
        console.error('Error fetching Fee Plan details single:', error);
        throw error;
    }
}

export async function updateFeePlan(poId, data) {
    try {
        const result = await model.poModel.update(data, {
            where: { poId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating FeePlan creation ${poId}:`, error);
        throw error; 
    }
}

export async function deleteFeePlan(poId) {
    const deleted = await model.poModel.destroy({ where: { poId: poId } });
    return deleted > 0;
}