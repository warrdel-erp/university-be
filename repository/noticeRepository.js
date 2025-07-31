import { literal, Op } from 'sequelize';
import * as model from '../models/index.js'

export async function addNotice(data, transaction) {
  try {
    const result = await model.noticeModel.create(data, { transaction });
    return result;
  } catch (error) {
    console.error("Error in add notice :", error);
    throw error;
  }
};

export async function getAllStudentNotice(universityId,acedmicYearId,instituteId,role) {
    try {
        const whereClause = {
            ...(universityId && { university_id: universityId }),
            ...(acedmicYearId && { acedmicYearId: acedmicYearId }),
            [Op.and]: [
                literal(`JSON_CONTAINS(message_to, '"students"')`)
            ]
        };

        const notice = await model.noticeModel.findAll({
            attributes: {
                exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
            },
            where: whereClause
        });

        return notice;
    } catch (error) {
        console.error('Error fetching student notices:', error);
        throw error;
    }
}

export async function getSingleNoticeDetails(NoticeId) {
     try {
        const Notice = await model.noticeModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
            where:{
                NoticeId
            },
            include:[
                {
                    model: model.feeNewInvoiceModel,
                    as: "invoices",
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                    include:[
                        {
                            model:model.NoticeSemesterModel,
                            as:'semesters',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        },
                        {
                            model:model.NoticeTypeModel,
                            as:'additionalFees',
                            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt","createdBy","updatedBy"] },
                        }
                    ]
                },
                
            ]
        });

        return Notice;
    } catch (error) {
        console.error('Error fetching Fee Plan details single:', error);
        throw error;
    }
}

export async function updateNotice(noticeId, data) {
    try {
        const result = await model.noticeModel.update(data, {
            where: { noticeId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Notice creation ${noticeId}:`, error);
        throw error; 
    }
}

export async function deleteNotice(noticeId) {
    const deleted = await model.noticeModel.destroy({ where: { noticeId: noticeId } });
    return deleted > 0;
};

export async function findByPlanId(NoticeId) {
  try {
    const Notice = await model.feeNewInvoiceModel.findAll({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },
      where: {
        NoticeId
      }
    });

    return Notice;
  } catch (error) {
    console.error("Error in findByPlanId:", error);
    throw error;
  }
};