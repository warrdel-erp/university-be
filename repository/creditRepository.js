import * as model from '../models/index.js'

export async function addCredit(creditData) {
  try {
    const result = await model.creditModel.bulkCreate(creditData);
    return result;
  } catch (error) {
    console.error("Error in add Credit:", error);
    throw error;
  }
};

export async function getCreditDetails(universityId,courseId,sessionId,role,instituteId) {
  try {
    const credits = await model.creditModel.findAll({
      where: {
        ...(universityId && { universityId }),
        ...(role === "Head" && instituteId && { instituteId }),
        ...(courseId && { courseId }),
        ...(sessionId && { sessionId })
      },

      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },

      include: [
        {
          model: model.courseModel,
          as: "courseCredit",
          attributes: ["courseId", "courseName"]
        },
        {
          model: model.sessionModel,
          as: "sessionCredit",
          attributes: ["sessionId", "sessionName"]
        },
        {
          model: model.subjectModel,
          as: "subjectCredit",
          attributes: ["subjectId", "subjectName", "subjectCode"]
        }
      ]
    });

    return credits;
  } catch (error) {
    console.error("Error fetching Credit details:", error);
    throw error;
  }
}



export async function getSingleCreditDetails(creditId) {
  try {
    const credit = await model.creditModel.findOne({
      where: { creditId },

      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },

      include: [
        {
          model: model.courseModel,
          as: "courseCredit",
          attributes: ["courseId", "courseName"]
        },
        {
          model: model.sessionModel,
          as: "sessionCredit",
          attributes: ["sessionId", "sessionName"]
        },
        {
          model: model.subjectModel,
          as: "subjectCredit",
          attributes: ["subjectId", "subjectName", "subjectCode"]
        }
      ]
    });

    return credit;
  } catch (error) {
    console.error("Error fetching Credit details:", error);
    throw error;
  }
}


export async function deleteCredit(creditId) {
    const deleted = await model.creditModel.destroy({ where: { creditId: creditId } });
    return deleted > 0;
}

export async function updateCredit(creditId, CreditData) {
    try {
        const result = await model.creditModel.update(CreditData, {
            where: { creditId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Credit creation ${creditId}:`, error);
        throw error; 
    }
}