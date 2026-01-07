import * as model from '../models/index.js'

export async function addEvaluation(evaluationData) {
  try {
    const result = await model.evalutionModel.bulkCreate(evaluationData);
    return result;
  } catch (error) {
    console.error("Error in add Evaluation:", error);
    throw error;
  }
};

export async function getEvaluationDetails(universityId,examSetupTypeId,role,instituteId) {
  try {
    const Evaluations = await model.evalutionModel.findAll({
      where: {
        ...(universityId && { universityId }),
        ...(role === "Head" && instituteId && { instituteId }),
        ...(examSetupTypeId && { examSetupTypeId }),
      },

      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },

      include: [
        {
          model: model.employeeModel,
          as: "employeeEvalution",
          attributes: ["employeeId", "employeeName","employeeCode","department"]
        },
        {
          model: model.subjectModel,
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName","subjectCode"]
        },
        {
          model: model.examSetupTypeModel,
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"]
        }
      ]
    });

    return Evaluations;
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
};

export async function getSingleEvaluationDetails(evalutionId) {
  try {
    const Evaluation = await model.evalutionModel.findOne({
      where: { evalutionId },

      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },

      include: [
        {
          model: model.employeeModel,
          as: "employeeEvalution",
          attributes: ["employeeId", "employeeName","employeeCode","department"]
        },
        {
          model: model.subjectModel,
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName","subjectCode"]
        },
        {
          model: model.examSetupTypeModel,
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"]
        }
      ]
    });

    return Evaluation;
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
}

export async function getTeacherSubjectEvalution(employeeId) {
  try {
    const Evaluation = await model.evalutionModel.findOne({
      where: { employeeId },

      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
      },

      include: [
        {
          model: model.employeeModel,
          as: "employeeEvalution",
          attributes: ["employeeId", "employeeName","employeeCode","department"]
        },
        {
          model: model.subjectModel,
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName","subjectCode"]
        },
        {
          model: model.examSetupTypeModel,
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          // include:[
          //   {
          //     model:model.examScheduleModel,
          //     as:'examSchedulesTypes',
          //     exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"]
          //   }
          // ]
        }
      ]
    });

    return Evaluation;
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
}

export async function deleteEvaluation(evalutionId) {
    const deleted = await model.evalutionModel.destroy({ where: { evalutionId: evalutionId } });
    return deleted > 0;
}

export async function updateEvaluation(evalutionId, evaluationData) {
    try {
        const result = await model.evalutionModel.update(evaluationData, {
            where: { evalutionId }
        });
        return result; 
    } catch (error) {
        console.error(`Error updating Evaluation creation ${evalutionId}:`, error);
        throw error; 
    }
}