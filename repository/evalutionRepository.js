import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

export async function addEvaluation(evaluationData) {
  try {
    const result = await scoped(model.evalutionModel).bulkCreate(evaluationData);
    return result;
  } catch (error) {
    console.error("Error in add Evaluation:", error);
    throw error;
  }
};

export async function getEvaluationDetails(examSetupTypeId) {
  try {
    const Evaluations = await scoped(model.evalutionModel).findAll({
      where: {
        ...(examSetupTypeId && { examSetupTypeId }),
      },
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      include: [
        {
          model: model.employeeModel.unscoped(),
          as: "employeeEvalution",
          attributes: ["employeeId", "employeeName", "employeeCode", "department"],
          where: buildScope(model.employeeModel),
          required: false,
        },
        {
          model: model.subjectModel.unscoped(),
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          where: buildScope(model.subjectModel),
          required: false,
        },
        {
          model: model.examSetupTypeModel.unscoped(),
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          where: buildScope(model.examSetupTypeModel),
          required: false,
        },
      ],
    });

    return Evaluations;
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
};

export async function getSingleEvaluationDetails(evalutionId) {
  try {
    const Evaluation = await scoped(model.evalutionModel).findOne({
      where: { evalutionId },
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      include: [
        {
          model: model.employeeModel.unscoped(),
          as: "employeeEvalution",
          attributes: ["employeeId", "employeeName", "employeeCode", "department"],
          where: buildScope(model.employeeModel),
          required: false,
        },
        {
          model: model.subjectModel.unscoped(),
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          where: buildScope(model.subjectModel),
          required: false,
        },
        {
          model: model.examSetupTypeModel.unscoped(),
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          where: buildScope(model.examSetupTypeModel),
          required: false,
        },
      ],
    });

    return Evaluation;
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
}

export async function getTeacherSubjectEvalution(employeeId) {
  try {
    const Evaluation = await scoped(model.evalutionModel).findOne({
      where: { employeeId },
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      include: [
        {
          model: model.employeeModel.unscoped(),
          as: "employeeEvalution",
          attributes: ["employeeId", "employeeName", "employeeCode", "department"],
          where: buildScope(model.employeeModel),
          required: true,
        },
        {
          model: model.subjectModel.unscoped(),
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          where: buildScope(model.subjectModel),
          required: false,
        },
        {
          model: model.examSetupTypeModel.unscoped(),
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          where: buildScope(model.examSetupTypeModel),
          required: false,
        },
      ],
    });

    return Evaluation;
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
}

export async function deleteEvaluation(evalutionId) {
    const existing = await scoped(model.evalutionModel).findOne({
        where: { evalutionId },
        attributes: ['evalutionId'],
    });
    if (!existing) {
        return false;
    }
    const deleted = await scoped(model.evalutionModel).destroy({ where: { evalutionId } });
    return deleted > 0;
}

export async function updateEvaluation(evalutionId, evaluationData) {
    try {
        const existing = await scoped(model.evalutionModel).findOne({
            where: { evalutionId },
            attributes: ['evalutionId'],
        });
        if (!existing) {
            return [0];
        }
        const result = await scoped(model.evalutionModel).update(evaluationData, {
            where: { evalutionId },
        });
        return result;
    } catch (error) {
        console.error(`Error updating Evaluation creation ${evalutionId}:`, error);
        throw error;
    }
}
