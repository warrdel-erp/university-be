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
            model: model.examSetupTypeModel,
            as: 'assessmentExamType',
            required: true,
            where: buildScope(model.examSetupTypeModel),
            attributes: ['examSetupTypeId'],
        }],
    });
}

const assessmentIncludes = [
    {
        model: model.subjectModel,
        as: "assessmentSubject",
        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
        where: buildScope(model.subjectModel),
        required: false,
        include: [{
            model: model.courseModel,
            as: 'courseInfo',
            attributes: ['termType'],
            required: false,
        }],
    },
    {
        model: model.examSetupTypeModel,
        as: "assessmentExamType",
        attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
        where: buildScope(model.examSetupTypeModel),
        required: true,
        include: [
            {
                model: model.syllabusDetailsModel,
                as: 'syllabusDetailsExam',
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
            },
            {
                model: model.examStructureModel,
                as: 'examStructure',
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                where: buildScope(model.examStructureModel),
                required: false,
            },
        ],
    },
];

async function findStudentsForAssessmentTerm({ term, courseId, examAssessmentId }) {
    if (term == null || courseId == null) {
        return [];
    }

    return scoped(model.studentModel).findAll({
        attributes: ["studentId", "scholarNumber", "firstName", "middleName", "lastName"],
        where: { courseId: Number(courseId) },
        include: [
            {
                model: model.classSectionTermModel,
                as: 'studentClassSectionTerm',
                required: true,
                attributes: ['classSectionTermId', 'term'],
                where: { term: Number(term) },
            },
            {
                model: model.assessmentEvaluationModel,
                as: 'studentresult',
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                required: false,
                where: { examAssessmentId: Number(examAssessmentId) },
            },
        ],
    });
}

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
    const assessment = await model.internalAssessmentModel.findOne({
        where: { subjectId, employeeId },
        include: [
            {
                model: model.subjectModel,
                as: "assessmentSubject",
                attributes: { exclude: ["deletedAt", "createdBy", "updatedBy"] },
                where: buildScope(model.subjectModel),
                required: true,
                include: [{
                    model: model.courseModel,
                    as: 'courseInfo',
                    attributes: ['termType', 'courseId'],
                    required: false,
                }],
            },
            ...assessmentIncludes.filter((includeRow) => includeRow.as !== 'assessmentSubject'),
            {
                model: model.employeeModel,
                as: "employees",
                attributes: ["employeeId", "employeeCode", "employeeName"],
                where: buildScope(model.employeeModel),
                required: true,
            },
        ],
    });

    if (!assessment) {
        return null;
    }

    const plain = assessment.get({ plain: true });
    const termStudents = await findStudentsForAssessmentTerm({
        term: plain.term,
        courseId: plain.assessmentSubject?.courseId,
        examAssessmentId: plain.examAssessmentId,
    });

    assessment.setDataValue('termStudents', termStudents);
    return assessment;
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
