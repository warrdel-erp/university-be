import * as model from "../models/index.js";
import { buildScope, scoped } from "../utility/scoped.js";

const internalAssessmentAttributes = [
  "internalAssessmentId",
  "universityId",
  "instituteId",
  "academicYearId",
  "subjectId",
  "classSectionTermId",
  "sessionId",
  "userId",
  "examSetupTypeId",
  "type",
  "maximumMarks",
  "issueDate",
  "dueDate",
  "documentUrl",
  "mode",
  "weightage",
  "weightagePercentage",
  "normalizedMaxMarks",
  "createdAt",
  "updatedAt",
];

const studentEvaluationAttributes = [
  "internalAssessmentStudentEvaluationId",
  "studentId",
  "internalAssessmentId",
  "obtainedMarks",
  "createdAt",
  "updatedAt",
];

const studentAttributes = [
  "studentId",
  "scholarNumber",
  "enrollNumber",
  "firstName",
  "middleName",
  "lastName",
];

const examSetupTypeAttributes = [
  "examSetupTypeId",
  "examName",
  "examCategory",
];

async function getAssessmentPlanWeightage(
  subjectId,
  courseId,
  sessionId,
  transaction,
) {
  const mappingWhere = { subjectId, courseId };
  if (sessionId) {
    mappingWhere.sessionId = sessionId;
  }

  const mapping = await scoped(
    model.assessmentPlanSubjectMappingModel,
  ).findOne({
    where: mappingWhere,
    attributes: [
      "assessmentPlanSubjectMappingId",
      "assessmentPlanId",
      "examSetupTypeId",
    ],
    transaction,
  });

  if (!mapping) {
    return null;
  }

  // Prefer CONTINUOUS_ASSESSMENT component on the plan
  const continuousComponent = await scoped(
    model.assessmentPlanComponentModel,
  ).findOne({
    where: { assessmentPlanId: mapping.assessmentPlanId },
    attributes: [
      "assessmentPlanComponentId",
      "examSetupTypeId",
      "weightagePercentage",
    ],
    include: [
      {
        model: model.examSetupTypeModel,
        as: "examSetupType",
        attributes: examSetupTypeAttributes,
        required: true,
        where: { examCategory: "CONTINUOUS_ASSESSMENT" },
      },
    ],
    transaction,
  });

  if (continuousComponent) {
    return continuousComponent;
  }

  // Fallback: use the exam type linked on the subject mapping
  if (!mapping.examSetupTypeId) {
    return null;
  }

  return scoped(model.assessmentPlanComponentModel).findOne({
    where: {
      assessmentPlanId: mapping.assessmentPlanId,
      examSetupTypeId: mapping.examSetupTypeId,
    },
    attributes: [
      "assessmentPlanComponentId",
      "examSetupTypeId",
      "weightagePercentage",
    ],
    include: [
      {
        model: model.examSetupTypeModel,
        as: "examSetupType",
        attributes: examSetupTypeAttributes,
        required: true,
      },
    ],
    transaction,
  });
}

export async function getUserInternalAssessments(userId) {
  const teacherCells = await scoped(model.timeTableCellTeachersModel).findAll({
    where: {
      userId,
      teacherType: "Primary",
    },
    attributes: ["timeTableCellTeacherId", "timeTableCellId"],
    include: [
      {
        model: model.timeTableCellModel,
        as: "timeTableCell",
        required: true,
        attributes: ["timeTableCellId", "subjectId"],
        include: [
          {
            model: model.subjectModel,
            as: "timeTableSubject",
            attributes: ["subjectId", "subjectName", "subjectCode"],
            required: true,
          },
          {
            model: model.timeTableRoutineModel,
            as: "timeTableRoutine",
            required: true,
            attributes: ["timeTableRoutineId", "courseId", "classSectionTermId"],
          },
        ],
      },
    ],
  });

  const subjectsMap = new Map();
  const classSectionTermIds = new Set();

  for (const cell of teacherCells) {
    const timeTableCell = cell.timeTableCell;
    const routine = timeTableCell.timeTableRoutine;
    const classSectionTermId = routine.classSectionTermId;
    const subjectId = timeTableCell.subjectId;

    if (!classSectionTermId || !subjectId) {
      continue;
    }

    classSectionTermIds.add(classSectionTermId);

    // One entry per subject within a classSectionTerm
    const key = `${subjectId}-${classSectionTermId}`;
    if (!subjectsMap.has(key)) {
      subjectsMap.set(key, {
        userId,
        subjectId,
        courseId: routine.courseId,
        classSectionTermId,
        sessionId: null,
        studentCount: 0,
        assessmentSubject: timeTableCell.timeTableSubject,
        assessmentExamType: {
          examSetupTypeId: null,
          examName: null,
          examCategory: null,
        },
        fetchedWeightage: 0,
      });
    }
  }

  const sessionByTermId = new Map();
  const studentCountByTermId = new Map();

  if (classSectionTermIds.size > 0) {
    const termRows = await scoped(model.classSectionTermModel).findAll({
      where: {
        classSectionTermId: Array.from(classSectionTermIds),
      },
      attributes: ["classSectionTermId", "classSectionsId"],
      include: [
        {
          model: model.classSectionModel,
          as: "classSection",
          attributes: ["classSectionsId", "sessionId"],
          required: true,
        },
      ],
    });

    for (const termRow of termRows) {
      sessionByTermId.set(
        termRow.classSectionTermId,
        termRow.classSection.sessionId,
      );
    }

    for (const classSectionTermId of classSectionTermIds) {
      const studentCount = await scoped(model.studentModel).count({
        where: { classSectionTermId },
      });
      studentCountByTermId.set(classSectionTermId, studentCount);
    }
  }

  for (const entry of subjectsMap.values()) {
    entry.sessionId = sessionByTermId.get(entry.classSectionTermId) || null;
    entry.studentCount =
      studentCountByTermId.get(entry.classSectionTermId) || 0;

    const planComponent = await getAssessmentPlanWeightage(
      entry.subjectId,
      entry.courseId,
      entry.sessionId,
    );

    if (planComponent) {
      entry.fetchedWeightage = Math.round(
        Number(planComponent.weightagePercentage),
      );
      entry.assessmentExamType.examSetupTypeId =
        planComponent.examSetupType.examSetupTypeId;
      entry.assessmentExamType.examName = planComponent.examSetupType.examName;
      entry.assessmentExamType.examCategory =
        planComponent.examSetupType.examCategory;
    }
  }

  return Array.from(subjectsMap.values());
}

export async function createInternalAssessment(payload, transaction) {
  const { classSectionTermId, subjectId } = payload;

  const classSectionTerm = await scoped(
    model.classSectionTermModel,
  ).findByPk(classSectionTermId, {
    attributes: ["classSectionTermId", "classSectionsId"],
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        attributes: ["classSectionsId", "courseId", "sessionId"],
      },
    ],
    transaction,
  });

  if (!classSectionTerm || !classSectionTerm.classSection) {
    throw new Error(
      "Invalid classSectionTermId: Could not find related course and session.",
    );
  }

  const { courseId, sessionId } = classSectionTerm.classSection;
  payload.sessionId = sessionId;

  const continuousComponent = await getAssessmentPlanWeightage(
    subjectId,
    courseId,
    sessionId,
    transaction,
  );

  if (continuousComponent) {
    payload.weightage = Math.round(
      Number(continuousComponent.weightagePercentage),
    );
    payload.examSetupTypeId = continuousComponent.examSetupType.examSetupTypeId;
  }

  return scoped(model.internalAssessmentModel).create(payload, {
    transaction,
  });
}

export async function getInternalAssessmentsBySubject(filters) {
  const { subjectId, classSectionTermId } = filters;

  return scoped(model.internalAssessmentModel).findAll({
    where: {
      subjectId,
      classSectionTermId,
    },
    attributes: internalAssessmentAttributes,
    include: [
      {
        model: model.examSetupTypeModel,
        as: "assessmentExamType",
        attributes: ["examSetupTypeId", "examName", "examCategory"],
        required: false,
      },
    ],
    order: [
      ["issueDate", "ASC"],
      ["internalAssessmentId", "ASC"],
    ],
  });
}

export async function getInternalAssessmentById(internalAssessmentId) {
  return scoped(model.internalAssessmentModel).findOne({
    where: { internalAssessmentId },
    attributes: internalAssessmentAttributes,
    include: [
      {
        model: model.examSetupTypeModel,
        as: "assessmentExamType",
        attributes: ["examSetupTypeId", "examName", "examCategory"],
        required: false,
      },
      {
        model: model.internalAssessmentStudentEvaluationModel,
        as: "studentEvaluations",
        attributes: studentEvaluationAttributes,
        required: false,
        where: buildScope(model.internalAssessmentStudentEvaluationModel),
        include: [
          {
            model: model.studentModel,
            as: "student",
            attributes: studentAttributes,
            required: false,
          },
        ],
      },
    ],
  });
}

export async function updateInternalAssessment(
  internalAssessmentId,
  payload,
  transaction,
) {
  return scoped(model.internalAssessmentModel).update(payload, {
    where: { internalAssessmentId },
    transaction,
  });
}

export async function getStudentEvaluationsByAssessmentId(
  internalAssessmentId,
) {
  return scoped(model.internalAssessmentStudentEvaluationModel).findAll({
    where: { internalAssessmentId },
    attributes: studentEvaluationAttributes,
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: studentAttributes,
        required: false,
      },
    ],
    order: [["studentId", "ASC"]],
  });
}

export async function getStudentsByClassSectionTermId(classSectionTermId) {
  return scoped(model.studentModel).findAll({
    where: { classSectionTermId },
    attributes: studentAttributes,
    order: [
      ["scholarNumber", "ASC"],
      ["studentId", "ASC"],
    ],
  });
}

export async function upsertStudentEvaluations(rows, transaction) {
  return scoped(model.internalAssessmentStudentEvaluationModel).bulkCreate(
    rows,
    {
      transaction,
      updateOnDuplicate: ["obtainedMarks", "updatedAt"],
    },
  );
}
