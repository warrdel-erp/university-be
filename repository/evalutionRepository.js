import * as model from '../models/index.js';
import { buildScope, scoped } from '../utility/scoped.js';

const evaluationEmployeeInclude = (required = false) => ({
  model: model.employeeModel,
  as: "evalutionEmployee",
  attributes: ["userId", "employeeName", "employeeCode", "departmentId"],
  where: buildScope(model.employeeModel),
  required,
});

function mapEvaluationUserShape(row) {
  if (!row) {
    return row;
  }

  const employee = row.evalutionEmployee;
  const userPayload = employee
    ? {
        userId: employee.userId,
        employeeName: employee.employeeName,
        employeeCode: employee.employeeCode,
        departmentId: employee.departmentId,
      }
    : null;

  if (row.setDataValue) {
    row.setDataValue("user", userPayload);
    row.setDataValue("evalutionEmployee", undefined);
  } else {
    row.user = userPayload;
    delete row.evalutionEmployee;
  }

  return row;
}

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
        evaluationEmployeeInclude(),
        {
          model: model.subjectModel,
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          where: buildScope(model.subjectModel),
          required: false,
        },
        {
          model: model.examSetupTypeModel,
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          where: buildScope(model.examSetupTypeModel),
          required: false,
        },
      ],
    });

    for (const row of Evaluations) {
      mapEvaluationUserShape(row);
    }

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
        evaluationEmployeeInclude(),
        {
          model: model.subjectModel,
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          where: buildScope(model.subjectModel),
          required: false,
        },
        {
          model: model.examSetupTypeModel,
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          where: buildScope(model.examSetupTypeModel),
          required: false,
        },
      ],
    });

    return mapEvaluationUserShape(Evaluation);
  } catch (error) {
    console.error("Error fetching Evaluation details:", error);
    throw error;
  }
}

export async function getTeacherSubjectEvalution(userId) {
  try {
    const Evaluation = await scoped(model.evalutionModel).findOne({
      where: { userId },
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt", "createdBy", "updatedBy"],
      },
      include: [
        evaluationEmployeeInclude(true),
        {
          model: model.subjectModel,
          as: "subjectEvalution",
          attributes: ["subjectId", "subjectName", "subjectCode"],
          where: buildScope(model.subjectModel),
          required: false,
        },
        {
          model: model.examSetupTypeModel,
          as: "examSetupTypeEvalution",
          attributes: ["examSetupTypeId", "examType", "examName"],
          where: buildScope(model.examSetupTypeModel),
          required: false,
        },
      ],
    });

    return mapEvaluationUserShape(Evaluation);
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
