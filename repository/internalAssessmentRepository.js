import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

async function assertScopedExamSetupType(examSetupTypeId, transaction) {
    return scoped(model.examSetupTypeModel).findOne({
        where: { examSetupTypeId },
        attributes: ['examSetupTypeId'],
        transaction,
    });
}

async function assertScopedInternalAssessment(examAssessmentId, transaction) {
    return model.internalAssessmentModel.findOne({
        where: { examAssessmentId },
        attributes: ['examAssessmentId', 'examSetupTypeId'],
        transaction,
        include: [{
            model: model.examSetupTypeModel.unscoped(),
            as: 'assessmentExamType',
            required: true,
            where: buildScope(model.examSetupTypeModel),
            attributes: ['examSetupTypeId'],
        }],
    });
}

const assessmentIncludes = [
    { model: model.subjectModel.unscoped(), as: "assessmentSubject", attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }, where: buildScope(model.subjectModel), required: false },
    { model: model.semesterModel.unscoped(), as: "assessmentSemester", attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }, where: buildScope(model.semesterModel), required: false },
    {
        model: model.examSetupTypeModel.unscoped(),
        as: "assessmentExamType",
        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
        where: buildScope(model.examSetupTypeModel),
        required: true,
        include: [
            {
                model: model.syllabusDetailsModel.unscoped(),
                as: 'syllabusDetailsExam',
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
            },
            {
                model: model.examStructureModel.unscoped(),
                as: 'examStructure',
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                where: buildScope(model.examStructureModel),
                required: false,
            },
        ],
    },
];

export async function addInternalAssessment(data) {
    const setupType = await assertScopedExamSetupType(data.examSetupTypeId);
    if (!setupType) {
        throw new Error('Exam setup type not found');
    }
    return await model.internalAssessmentModel.create(data);
}

export async function getAllInternalAssessment(examSetupTypeId) {
    const setupType = await assertScopedExamSetupType(examSetupTypeId);
    if (!setupType) {
        return [];
    }
    return await model.internalAssessmentModel.findAll({
        where: { examSetupTypeId },
        include: assessmentIncludes,
        order: [["createdAt", "DESC"]],
    });
};

export async function getInternalAssessmentById(examAssessmentId) {
    const existing = await assertScopedInternalAssessment(examAssessmentId);
    if (!existing) {
        return null;
    }
    return await model.internalAssessmentModel.findOne({
        where: { examAssessmentId },
        include: assessmentIncludes,
    });
};

export async function updateInternalAssessment(examAssessmentId, data) {
    try {
        const existing = await assertScopedInternalAssessment(examAssessmentId);
        if (!existing) {
            return [0];
        }
        return await model.internalAssessmentModel.update(
            data,
            { where: { examAssessmentId } },
        );
    } catch (error) {
        console.error(
            `Error updating internal assessment ID ${examAssessmentId}:`,
            error,
        );
        throw error;
    }
};

export async function deleteInternalAssessment(examAssessmentId) {
    const existing = await assertScopedInternalAssessment(examAssessmentId);
    if (!existing) {
        return 0;
    }
    return await model.internalAssessmentModel.destroy({ where: { examAssessmentId } });
};

export async function evaluationInternalAssessment(subjectId, employeeId) {
    return await model.internalAssessmentModel.findOne({
        where: { subjectId, employeeId },
        include: [
            { model: model.subjectModel.unscoped(), as: "assessmentSubject", attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] }, where: buildScope(model.subjectModel), required: true },
            {
                model: model.semesterModel.unscoped(),
                as: "assessmentSemester",
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                where: buildScope(model.semesterModel),
                required: false,
                include: [
                    {
                        model: model.studentModel.unscoped(),
                        as: 'studentSemester',
                        attributes: ["studentId", "scholarNumber", "firstName", "middleName", "lastName"],
                        where: buildScope(model.studentModel),
                        required: false,
                        include: [
                            {
                                model: model.assessmentEvaluationModel.unscoped(),
                                as: 'studentresult',
                                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                            },
                        ],
                    },
                ],
            },
            ...assessmentIncludes.filter((i) => i.as !== 'assessmentSubject' && i.as !== 'assessmentSemester'),
            { model: model.employeeModel.unscoped(), as: "employees", attributes: ["employeeId", "employeeCode", "employeeName"], where: buildScope(model.employeeModel), required: true },
        ],
    });
};

export async function bulkInsertEvaluation(dataArray) {
  try {
    if (dataArray?.length) {
      const assessmentId = dataArray[0].examAssessmentId;
      const existing = await assertScopedInternalAssessment(assessmentId);
      if (!existing) {
        throw new Error('Internal assessment not found');
      }
    }
    return await model.assessmentEvaluationModel.bulkCreate(dataArray);
  } catch (error) {
    console.error("Repository Error evalution:", error);
    throw error;
  }
};

export async function updateEvaluation(id, data) {
  const evaluation = await model.assessmentEvaluationModel.findOne({
    where: { assessmentEvalutionId: id },
    attributes: ['assessmentEvalutionId', 'examAssessmentId'],
  });
  if (!evaluation) {
    return [0];
  }
  const assessment = await assertScopedInternalAssessment(evaluation.examAssessmentId);
  if (!assessment) {
    return [0];
  }
  return await model.assessmentEvaluationModel.update(data, {
    where: { assessmentEvalutionId: id },
  });
}
