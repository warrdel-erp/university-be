import * as model from '../models/index.js'


export async function getStudentCount(type, universityId, instituteId, role) {
  try {
    const baseWhere = {
      ...(universityId && { universityId }),
      ...(role === 'Head' && { instituteId }) 
    };

    if (!type || type === 'total') {
      const [activeCount, inactiveCount] = await Promise.all([
        model.studentModel.count({ where: {...baseWhere, feeStatus: true } }),
        model.studentModel.count({ where: {...baseWhere, feeStatus: false } })
      ]);
      return {
        active: activeCount,
        inactive: inactiveCount,
        all: activeCount + inactiveCount
      };
    }

    const whereClause = { ...baseWhere };

    if (type === 'active') {
      whereClause.feeStatus = true;
    } else if (type === 'inactive') {
      whereClause.feeStatus = false;
    }

    const studentList = await model.studentModel.findAll({
      attributes:  ["studentId","firstName","middleName","lastName","scholarNumber","admisssionDate"] ,
      where: whereClause,
      include:[
        {
            model:model.feePlanModel,
            as:'studentFeePlan',
            attributes: {exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy","updatedBy","description"] },
             include:
                        [
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
                        ]
        },
        {
          model:model.classSectionModel,
          as:'studentSections',
          attributes: { exclude: [ "createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy", "affiliated_university_id", "institute_id", "course_id", "semester_id", "class_id", "acedmic_year_id", "specialization_id", "session_id" ] }
        }
      ]
    });

    return studentList;

  } catch (error) {
    console.error('Error in getStudentCount:', error);
    throw error;
  }
};

export async function getAllActiveInvoice(universityId) {
     try {
        const FeePlan = await model.studentInvoiceMapperModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:{
                universityId
            },
            include:[
                {
                    model: model.studentModel,
                    as: "studentinvoice",
                    attributes: ["scholarNumber", "firstName", "middleName","lastName","admisssionDate","enrollDate"] ,
                },
                {
                    model: model.feeNewInvoiceModel,
                    as: "feeInvoicedata",
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
                {
                    model: model.feeInvoiceDetailRecordModel,
                    as: "studentMakePayment",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    
                },    
            ]
        });

        return FeePlan;
    } catch (error) {
        console.error('Error fetching all active fee plan:', error);
        throw error;
    }
}

export async function updateFeeNewInvoice(feeNewInvoiceId, data) {
    try {
        const result = await model.studentInvoiceMapperModel.update(data, {
            where: { feeNewInvoiceId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating studentInvoiceMapperModel  ${feeNewInvoiceId}:`, error);
        throw error; 
    }
};

// export async function deleteFeePlan(poId) {
//     const deleted = await model.poModel.destroy({ where: { poId: poId } });
//     return deleted > 0;
// };

// export async function findByPlanId(feePlanId) {
//   try {
//     const FeePlan = await model.feeNewInvoiceModel.findAll({
//       attributes: {
//         exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
//       },
//       where: {
//         feePlanId
//       }
//     });

//     return FeePlan;
//   } catch (error) {
//     console.error("Error in findByPlanId:", error);
//     throw error;
//   }
// };