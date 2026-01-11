import * as model from '../models/index.js'
import { Op } from "sequelize";

export async function addHead(headData,transaction) {
    try {
        const result = await model.headModel.create(headData,{transaction});
        return result;
    } catch (error) {
        console.error("Error in add head :", error);
        throw error;
    }
};

export async function getHeadDetails(universityId) {
    try {
        const head = await model.headModel.findAll({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { universityId },
            include:
                [
                    {
                        model: model.campusModel,
                        as: "headCampus",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                    {
                        model: model.instituteModel,
                        as: "headInstitute",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
            ]
        });

        return head;
    } catch (error) {
        console.error('Error fetching head details:', error);
        throw error;
    }
}


export async function getSingleHeadDetails(headId) {
    try {
        const head = await model.headModel.findOne({
            attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
            where: { headId },
            include:
                [
                    {
                        model: model.campusModel,
                        as: "headCampus",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
                    {
                        model: model.instituteModel,
                        as: "headInstitute",
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"] },
                    },
            ]
        });

        return head;
    } catch (error) {
        console.error('Error fetching head details:', error);
        throw error;
    }
}

export async function deleteHead(headId) {
    const deleted = await model.headModel.destroy({ where: { headId: headId } });
    return deleted > 0;
}

export async function updateHead(headId, headData) {
    try {
        const result = await model.headModel.update(headData, {
            where: { headId }
        });
        return result;
    } catch (error) {
        console.error(`Error updating head creation ${headId}:`, error);
        throw error;
    }
}

export async function getHeadDetailsByEmail(email) {
  try {
    const head = await model.headModel.findOne({
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },
      where: {
        [Op.or]: [
          { registerEmail: email },
          { alternateEmail: email }
        ]
      },
    });
    console.log(`>>>>>>head`,head);
    

    if (!head) {
      return null; 
    }

    return {
  role: head.isAdmin ? "Admin" : "Head",
  ...head.toJSON()
};


  } catch (error) {
    console.error("Error fetching head details by email:", error);
    throw error;
  }
}
