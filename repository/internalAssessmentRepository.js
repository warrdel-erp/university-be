import { Op, fn, col } from "sequelize";
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
  "title",
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

async function getMarkingProgressMap(internalAssessmentIds) {
  const progressMap = new Map();

  for (const internalAssessmentId of internalAssessmentIds) {
    progressMap.set(internalAssessmentId, {
      studentCount: 0,
      checked: 0,
      pendingForMarking: 0,
    });
  }

  if (internalAssessmentIds.length === 0) {
    return progressMap;
  }

  const where = {
    internalAssessmentId: { [Op.in]: internalAssessmentIds },
  };

  const [totalRows, checkedRows] = await Promise.all([
    scoped(model.internalAssessmentStudentEvaluationModel).findAll({
      where,
      attributes: [
        "internalAssessmentId",
        [
          fn("COUNT", col("internal_assessment_student_evaluation_id")),
          "studentCount",
        ],
      ],
      group: ["internalAssessmentId"],
      raw: true,
    }),
    scoped(model.internalAssessmentStudentEvaluationModel).findAll({
      where: {
        ...where,
        obtainedMarks: { [Op.not]: null },
      },
      attributes: [
        "internalAssessmentId",
        [
          fn("COUNT", col("internal_assessment_student_evaluation_id")),
          "checked",
        ],
      ],
      group: ["internalAssessmentId"],
      raw: true,
    }),
  ]);

  for (const row of totalRows) {
    const internalAssessmentId = Number(row.internalAssessmentId);
    const entry = progressMap.get(internalAssessmentId);
    entry.studentCount = Number(row.studentCount);
  }

  for (const row of checkedRows) {
    const internalAssessmentId = Number(row.internalAssessmentId);
    const entry = progressMap.get(internalAssessmentId);
    entry.checked = Number(row.checked);
  }

  for (const entry of progressMap.values()) {
    entry.pendingForMarking = entry.studentCount - entry.checked;
  }

  return progressMap;
}

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
      const sessionId = sessionByTermId.get(classSectionTermId);
      if (!sessionId) {
        studentCountByTermId.set(classSectionTermId, 0);
        continue;
      }

      const studentCount = await scoped(model.studentModel).count({
        where: { classSectionTermId, sessionId },
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

  const assessments = await scoped(model.internalAssessmentModel).findAll({
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

  const internalAssessmentIds = [];
  for (const assessment of assessments) {
    internalAssessmentIds.push(assessment.internalAssessmentId);
  }

  const progressMap = await getMarkingProgressMap(internalAssessmentIds);

  const result = [];
  for (const assessment of assessments) {
    const plain = assessment.get({ plain: true });
    const progress = progressMap.get(plain.internalAssessmentId);
    plain.studentCount = progress.studentCount;
    plain.checked = progress.checked;
    plain.pendingForMarking = progress.pendingForMarking;
    result.push(plain);
  }

  return result;
}

export async function getInternalAssessmentById(internalAssessmentId) {
  const assessment = await scoped(model.internalAssessmentModel).findOne({
    where: { internalAssessmentId },
    attributes: internalAssessmentAttributes,
    include: [
      {
        model: model.subjectModel,
        as: "assessmentSubject",
        attributes: ["subjectId", "subjectName", "subjectCode"],
        required: false,
      },
      {
        model: model.sessionModel,
        as: "assessmentSession",
        attributes: [
          "sessionId",
          "sessionName",
          "startingDate",
          "endingDate",
          "classTillDate",
        ],
        required: false,
      },
      {
        model: model.classSectionTermModel,
        as: "assessmentClassSectionTerm",
        attributes: ["classSectionTermId", "classSectionsId", "term"],
        required: false,
        include: [
          {
            model: model.classSectionModel,
            as: "classSection",
            attributes: [
              "classSectionsId",
              "courseId",
              "sessionId",
              "section",
            ],
            required: false,
            include: [
              {
                model: model.courseModel,
                as: "courseSection",
                attributes: ["courseId", "courseName", "courseCode"],
                required: false,
              },
            ],
          },
        ],
      },
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

  if (!assessment) {
    return null;
  }

  const plain = assessment.get({ plain: true });
  const progressMap = await getMarkingProgressMap([
    plain.internalAssessmentId,
  ]);
  const progress = progressMap.get(plain.internalAssessmentId);
  plain.studentCount = progress.studentCount;
  plain.checked = progress.checked;
  plain.pendingForMarking = progress.pendingForMarking;
  plain.course =
    plain.assessmentClassSectionTerm &&
    plain.assessmentClassSectionTerm.classSection &&
    plain.assessmentClassSectionTerm.classSection.courseSection
      ? plain.assessmentClassSectionTerm.classSection.courseSection
      : null;
  plain.session = plain.assessmentSession || null;

  return plain;
}

export async function getAssessmentStatusCounts(filters) {
  const { subjectId, classSectionTermId, userId } = filters;

  const assessments = await scoped(model.internalAssessmentModel).findAll({
    where: {
      subjectId,
      classSectionTermId,
      userId,
    },
    attributes: [
      "internalAssessmentId",
      "title",
      "type",
      "issueDate",
      "dueDate",
      "maximumMarks",
      "mode",
    ],
    order: [
      ["issueDate", "ASC"],
      ["internalAssessmentId", "ASC"],
    ],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let completed = 0;
  let open = 0;
  let upcoming = 0;
  const assessmentList = [];

  for (const assessment of assessments) {
    const issueDate = assessment.issueDate
      ? new Date(assessment.issueDate)
      : null;
    const dueDate = assessment.dueDate ? new Date(assessment.dueDate) : null;

    if (issueDate) {
      issueDate.setHours(0, 0, 0, 0);
    }
    if (dueDate) {
      dueDate.setHours(0, 0, 0, 0);
    }

    let status = "open";
    if (issueDate && issueDate > today) {
      status = "upcoming";
      upcoming += 1;
    } else if (dueDate && dueDate < today) {
      status = "completed";
      completed += 1;
    } else {
      open += 1;
    }

    assessmentList.push({
      internalAssessmentId: assessment.internalAssessmentId,
      title: assessment.title,
      type: assessment.type,
      maximumMarks: assessment.maximumMarks,
      mode: assessment.mode,
      issueDate: assessment.issueDate,
      dueDate: assessment.dueDate,
      status,
    });
  }

  return {
    total: assessments.length,
    completed,
    open,
    upcoming,
    assessments: assessmentList,
  };
}

export async function getUserDashboardSku(userId) {
  const subjects = await getUserInternalAssessments(userId);

  const assessments = await scoped(model.internalAssessmentModel).findAll({
    where: { userId },
    attributes: [
      "internalAssessmentId",
      "title",
      "type",
      "subjectId",
      "classSectionTermId",
    ],
    include: [
      {
        model: model.internalAssessmentStudentEvaluationModel,
        as: "studentEvaluations",
        attributes: ["obtainedMarks"],
        required: false,
        where: buildScope(model.internalAssessmentStudentEvaluationModel),
      },
    ],
  });

  let remaining = 0;
  let readyToSubmit = 0;
  const remainingAssessments = [];
  const readyToSubmitAssessments = [];

  for (const assessment of assessments) {
    const evaluations = assessment.studentEvaluations || [];
    const item = {
      internalAssessmentId: assessment.internalAssessmentId,
      title: assessment.title,
      type: assessment.type,
      subjectId: assessment.subjectId,
      classSectionTermId: assessment.classSectionTermId,
    };

    if (evaluations.length === 0) {
      remaining += 1;
      remainingAssessments.push(item);
      continue;
    }

    let allMarked = true;
    for (const evaluation of evaluations) {
      if (
        evaluation.obtainedMarks === null ||
        evaluation.obtainedMarks === undefined
      ) {
        allMarked = false;
        break;
      }
    }

    if (allMarked) {
      readyToSubmit += 1;
      readyToSubmitAssessments.push(item);
    } else {
      remaining += 1;
      remainingAssessments.push(item);
    }
  }

  return {
    totalSubjects: subjects.length,
    totalAssessments: assessments.length,
    remaining,
    readyToSubmit,
    remainingAssessments,
    readyToSubmitAssessments,
  };
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
  const assessment = await scoped(model.internalAssessmentModel).findOne({
    where: { internalAssessmentId },
    attributes: [
      "internalAssessmentId",
      "title",
      "type",
      "maximumMarks",
      "mode",
      "issueDate",
      "dueDate",
    ],
  });

  const evaluations = await scoped(
    model.internalAssessmentStudentEvaluationModel,
  ).findAll({
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

  return {
    internalAssessmentId,
    title: assessment ? assessment.title : null,
    type: assessment ? assessment.type : null,
    maximumMarks: assessment ? assessment.maximumMarks : null,
    mode: assessment ? assessment.mode : null,
    issueDate: assessment ? assessment.issueDate : null,
    dueDate: assessment ? assessment.dueDate : null,
    evaluations,
  };
}

export async function getStudentsByClassSectionTermId(
  classSectionTermId,
  transaction,
) {
  const classSectionTerm = await scoped(model.classSectionTermModel).findOne({
    where: { classSectionTermId },
    attributes: ["classSectionTermId", "classSectionsId"],
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        attributes: ["classSectionsId", "sessionId"],
        required: true,
      },
    ],
    transaction,
  });

  if (!classSectionTerm || !classSectionTerm.classSection) {
    return [];
  }

  const sessionId = classSectionTerm.classSection.sessionId;

  return scoped(model.studentModel).findAll({
    where: {
      classSectionTermId,
      sessionId,
    },
    attributes: studentAttributes,
    order: [
      ["scholarNumber", "ASC"],
      ["studentId", "ASC"],
    ],
    transaction,
  });
}

export async function createStudentEvaluationPlaceholders(
  rows,
  transaction,
) {
  if (!rows.length) {
    return [];
  }

  return scoped(model.internalAssessmentStudentEvaluationModel).bulkCreate(
    rows,
    {
      transaction,
      ignoreDuplicates: true,
    },
  );
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
