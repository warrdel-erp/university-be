import * as model from '../models/index.js'

export async function addFeePlan(data, transaction) {
  try {
    const result = await model.feePlanModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add Fee Plan :", error);
    throw error;
  }
};

export async function addFeeNewInvoice(data, transaction) {
  try {
    const result = await model.feeNewInvoiceModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add Fee New Invoice :", error);
    throw error;
  }
};

export async function addFeePlanSemester(data, transaction) {
  try {
    const result = await model.feePlanSemesterModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add Fee Plan Semester :", error);
    throw error;
  }
};

export async function addFeePlanType(data, transaction) {
  try {
    const result = await model.feePlanTypeModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add Fee Plan Type :", error);
    throw error;
  }
};

export async function getFeePlanDetails(universityId,instituteId,role,acedmicYearId) {
    try {
        const whereClause = {
            ...(universityId && { universityId }),
            ...(acedmicYearId && { acedmicYearId }),
            ...(role === 'Head' && { institute_id: instituteId })
        };
        const FeePlan = await model.feePlanModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:whereClause,
            include:[
                {
                  model:model.sessionModel,
                  as:'sessionFee',
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","acedmic_year_id"] },
                },
                {
                  model:model.courseModel,
                  as:'courseFee',
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","affiliated_university_id","institute_id","acedmic_year_id"] },
                },
                {
                  model:model.acedmicYearModel,
                  as:'acedmicYearFee',
                  attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy","affiliated_university_id","institute_id"] },
                },
                {
                    model: model.feeNewInvoiceModel,
                    as: "invoices",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.feePlanSemesterModel,
                            as:'semesters',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        },
                        {
                            model:model.feePlanTypeModel,
                            as:'additionalFees',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
                
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
        const FeePlan = await model.feePlanModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:{
                feePlanId
            },
            include:[
                {
                    model: model.feeNewInvoiceModel,
                    as: "invoices",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.feePlanSemesterModel,
                            as:'semesters',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        },
                        {
                            model:model.feePlanTypeModel,
                            as:'additionalFees',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
                
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
};

export async function findByPlanId(feePlanId) {
  try {
    const FeePlan = await model.feeNewInvoiceModel.findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },
      where: {
        feePlanId
      }
    });

    return FeePlan;
  } catch (error) {
    console.error("Error in findByPlanId:", error);
    throw error;
  }
};