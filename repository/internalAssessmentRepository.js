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
  "isIncludeInFinalResult",
  "createdAt",
  "updatedAt",
];

const studentEvaluationAttributes = [
  "internalAssessmentStudentEvaluationId",
  "studentId",
  "internalAssessmentId",
  "obtainedMarks",
  "documentUrl",
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
  "managedBy",
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
  options = {},
) {
  const { transaction } = options;
  const mappingWhere = {
    subjectId,
    courseId,
    [Op.or]: [{ sessionId }, { sessionId: null }],
  };

  const mapping = await scoped(
    model.assessmentPlanSubjectMappingModel,
  ).findOne({
    where: mappingWhere,
    attributes: [
      "assessmentPlanSubjectMappingId",
      "assessmentPlanId",
      "sessionId",
    ],
    order: [["sessionId", "DESC"]],
    transaction,
  });

  if (!mapping) {
    return null;
  }

  return scoped(model.assessmentPlanComponentModel).findOne({
    where: { assessmentPlanId: mapping.assessmentPlanId },
    attributes: [
      "assessmentPlanComponentId",
      "examSetupTypeId",
      "weightagePercentage",
      "maxAssessments",
      "duration",
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
}

async function getContinuousAssessmentPlanMap() {
  const components = await scoped(
    model.assessmentPlanComponentModel,
  ).findAll({
    attributes: [
      "assessmentPlanComponentId",
      "assessmentPlanId",
      "examSetupTypeId",
      "weightagePercentage",
      "maxAssessments",
      "duration",
    ],
    include: [
      {
        model: model.examSetupTypeModel,
        as: "examSetupType",
        attributes: examSetupTypeAttributes,
        required: true,
        where: { examCategory: "CONTINUOUS_ASSESSMENT" },
      },
      {
        model: model.assessmentPlanModel,
        as: "assessmentPlan",
        attributes: ["assessmentPlanId"],
        required: true,
        include: [
          {
            model: model.assessmentPlanSubjectMappingModel,
            as: "subjectMappings",
            attributes: [
              "assessmentPlanSubjectMappingId",
              "subjectId",
              "courseId",
              "sessionId",
            ],
            required: true,
            where: buildScope(model.assessmentPlanSubjectMappingModel),
          },
        ],
      },
    ],
  });

  const planMap = new Map();

  for (const component of components) {
    const plainComponent = {
      assessmentPlanComponentId: component.assessmentPlanComponentId,
      assessmentPlanId: component.assessmentPlanId,
      examSetupTypeId: component.examSetupTypeId,
      weightagePercentage: component.weightagePercentage,
      maxAssessments: component.maxAssessments,
      duration: component.duration,
      examSetupType: {
        examSetupTypeId: component.examSetupType.examSetupTypeId,
        examName: component.examSetupType.examName,
        examCategory: component.examSetupType.examCategory,
      },
    };

    const fetchedWeightage = Math.round(
      Number(component.weightagePercentage),
    );

    for (const mapping of component.assessmentPlan.subjectMappings) {
      const sessionKey =
        mapping.sessionId === null || mapping.sessionId === undefined
          ? "null"
          : mapping.sessionId;
      const key = `${mapping.subjectId}:${mapping.courseId}:${sessionKey}`;

      if (!planMap.has(key)) {
        planMap.set(key, {
          fetchedWeightage,
          assessmentPlanComponent: plainComponent,
        });
      }
    }
  }

  return planMap;
}

function resolveContinuousPlan(planMap, subjectId, courseId, sessionId) {
  const exact = planMap.get(`${subjectId}:${courseId}:${sessionId}`);
  if (exact) {
    return exact;
  }

  return planMap.get(`${subjectId}:${courseId}:null`) || null;
}

async function getStudentCountByTermAndSession(termSessionPairs) {
  const countMap = new Map();

  if (termSessionPairs.length === 0) {
    return countMap;
  }

  const rows = await scoped(model.studentModel).findAll({
    where: { [Op.or]: termSessionPairs },
    attributes: [
      "classSectionTermId",
      "sessionId",
      [fn("COUNT", col("student_id")), "studentCount"],
    ],
    group: ["classSectionTermId", "sessionId"],
    raw: true,
  });

  for (const row of rows) {
    const key = `${row.classSectionTermId}:${row.sessionId}`;
    countMap.set(key, Number(row.studentCount));
  }

  return countMap;
}

function filterUserInternalAssessmentsBySearch(entries, search) {
  const query = search.trim().toLowerCase();
  if (!query) {
    return entries;
  }

  const filtered = [];
  for (const entry of entries) {
    const subjectName = entry.assessmentSubject.subjectName
      ? entry.assessmentSubject.subjectName.toLowerCase()
      : "";
    const subjectCode = entry.assessmentSubject.subjectCode
      ? entry.assessmentSubject.subjectCode.toLowerCase()
      : "";
    const courseName =
      entry.course && entry.course.courseName
        ? entry.course.courseName.toLowerCase()
        : "";
    const term = entry.term === null || entry.term === undefined
      ? ""
      : String(entry.term);

    if (
      subjectName.includes(query) ||
      subjectCode.includes(query) ||
      courseName.includes(query) ||
      term.includes(query)
    ) {
      filtered.push(entry);
    }
  }

  return filtered;
}

export async function getUserInternalAssessments(userId, options = {}) {
  const search = options.search;
  const [continuousPlanMap, teacherCells] = await Promise.all([
    getContinuousAssessmentPlanMap(),
    scoped(model.timeTableCellTeachersModel).findAll({
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
              attributes: [
                "timeTableRoutineId",
                "courseId",
                "classSectionTermId",
              ],
              include: [
                {
                  model: model.courseModel,
                  as: "timeTableCourse",
                  attributes: ["courseId", "courseName", "courseCode"],
                  required: false,
                  include: [
                    {
                      model: model.departmentModel,
                      as: "courseProgram",
                      attributes: ["departmentId", "departmentName"],
                      required: false,
                    },
                  ],
                },
                {
                  model: model.classSectionTermModel,
                  as: "timeTableClassSectionTerm",
                  attributes: ["classSectionTermId", "term"],
                  required: true,
                  include: [
                    {
                      model: model.classSectionModel,
                      as: "classSection",
                      attributes: ["classSectionsId", "sessionId"],
                      required: true,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),
  ]);

  const subjectsMap = new Map();

  for (const cell of teacherCells) {
    const timeTableCell = cell.timeTableCell;
    const routine = timeTableCell.timeTableRoutine;
    const classSectionTerm = routine.timeTableClassSectionTerm;
    const subjectId = timeTableCell.subjectId;
    const courseId = routine.courseId;
    const classSectionTermId = routine.classSectionTermId;
    const sessionId = classSectionTerm.classSection.sessionId;

    if (!subjectId || !courseId || !classSectionTermId || !sessionId) {
      continue;
    }

    const plan = resolveContinuousPlan(
      continuousPlanMap,
      subjectId,
      courseId,
      sessionId,
    );

    const key = `${subjectId}-${classSectionTermId}`;
    if (subjectsMap.has(key)) {
      continue;
    }

    const course = routine.timeTableCourse
      ? routine.timeTableCourse.get({ plain: true })
      : null;
    const department = course && course.courseProgram
      ? course.courseProgram
      : null;

    const isContinuousAssessmentMapped = Boolean(plan);

    subjectsMap.set(key, {
      userId,
      subjectId,
      courseId,
      classSectionTermId,
      sessionId,
      term: classSectionTerm.term,
      studentCount: 0,
      assessmentSubject: timeTableCell.timeTableSubject.get({ plain: true }),
      course: course
        ? {
            courseId: course.courseId,
            courseName: course.courseName,
            courseCode: course.courseCode,
          }
        : null,
      department: department
        ? {
            departmentId: department.departmentId,
            departmentName: department.departmentName,
          }
        : null,
      isContinuousAssessmentMapped,
      assessmentPlanComponent: plan ? plan.assessmentPlanComponent : null,
      assessmentExamType: plan
        ? plan.assessmentPlanComponent.examSetupType
        : {
            examSetupTypeId: null,
            examName: null,
            examCategory: null,
          },
      fetchedWeightage: plan ? plan.fetchedWeightage : null,
      assessmentCount: 0,
      gradedAssessmentCount: 0,
      pendingAssessmentCount: 0,
      marksEnteredStudentCount: 0,
      marksStatus: "in_progress",
      submissionStatus: "not_ready",
    });
  }

  if (subjectsMap.size === 0) {
    return [];
  }

  let continuousEntries = Array.from(subjectsMap.values());
  if (search) {
    continuousEntries = filterUserInternalAssessmentsBySearch(
      continuousEntries,
      search,
    );
  }

  if (continuousEntries.length === 0) {
    return [];
  }

  const filteredTermSessionPairs = [];
  const filteredTermSessionKeySet = new Set();
  const assessmentWhere = [];

  for (const entry of continuousEntries) {
    assessmentWhere.push({
      subjectId: entry.subjectId,
      classSectionTermId: entry.classSectionTermId,
      userId,
    });

    const termSessionKey = `${entry.classSectionTermId}:${entry.sessionId}`;
    if (!filteredTermSessionKeySet.has(termSessionKey)) {
      filteredTermSessionKeySet.add(termSessionKey);
      filteredTermSessionPairs.push({
        classSectionTermId: entry.classSectionTermId,
        sessionId: entry.sessionId,
      });
    }
  }

  const [studentCountMap, assessments] = await Promise.all([
    getStudentCountByTermAndSession(filteredTermSessionPairs),
    scoped(model.internalAssessmentModel).findAll({
      where: { [Op.or]: assessmentWhere },
      attributes: ["internalAssessmentId", "subjectId", "classSectionTermId"],
    }),
  ]);

  for (const entry of continuousEntries) {
    entry.studentCount =
      studentCountMap.get(`${entry.classSectionTermId}:${entry.sessionId}`) ||
      0;
  }

  const assessmentIds = [];
  const assessmentsByCourseKey = new Map();

  for (const assessment of assessments) {
    const key = `${assessment.subjectId}-${assessment.classSectionTermId}`;
    assessmentIds.push(assessment.internalAssessmentId);

    if (!assessmentsByCourseKey.has(key)) {
      assessmentsByCourseKey.set(key, []);
    }
    assessmentsByCourseKey.get(key).push(assessment.internalAssessmentId);
  }

  const progressMap = await getMarkingProgressMap(assessmentIds);

  for (const entry of continuousEntries) {
    const key = `${entry.subjectId}-${entry.classSectionTermId}`;
    const courseAssessmentIds = assessmentsByCourseKey.get(key) || [];
    entry.assessmentCount = courseAssessmentIds.length;

    let gradedAssessmentCount = 0;
    let marksEnteredStudentCount =
      courseAssessmentIds.length === 0 ? 0 : entry.studentCount;

    for (const internalAssessmentId of courseAssessmentIds) {
      const progress = progressMap.get(internalAssessmentId);

      if (
        progress.studentCount > 0 &&
        progress.checked === progress.studentCount
      ) {
        gradedAssessmentCount += 1;
      }

      if (progress.checked < marksEnteredStudentCount) {
        marksEnteredStudentCount = progress.checked;
      }
    }

    entry.gradedAssessmentCount = gradedAssessmentCount;
    entry.pendingAssessmentCount =
      entry.assessmentCount - gradedAssessmentCount;
    entry.marksEnteredStudentCount = marksEnteredStudentCount;
    entry.marksStatus =
      entry.assessmentCount > 0 &&
      gradedAssessmentCount === entry.assessmentCount
        ? "complete"
        : "in_progress";
    entry.submissionStatus =
      entry.marksStatus === "complete" ? "ready" : "not_ready";
  }

  return continuousEntries;
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
    { transaction },
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
        attributes: ["examSetupTypeId", "examName", "examCategory", "managedBy"],
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
        attributes: ["examSetupTypeId", "examName", "examCategory", "managedBy"],
        required: false,
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

export async function getIncludedWeightageSum({
  subjectId,
  classSectionTermId,
  excludeInternalAssessmentId,
  transaction,
}) {
  const where = {
    subjectId: Number(subjectId),
    classSectionTermId: Number(classSectionTermId),
    isIncludeInFinalResult: true,
  };

  if (excludeInternalAssessmentId) {
    where.internalAssessmentId = {
      [Op.ne]: Number(excludeInternalAssessmentId),
    };
  }

  const result = await scoped(model.internalAssessmentModel).findOne({
    where,
    attributes: [[fn("SUM", col("weightage_percentage")), "totalWeightage"]],
    raw: true,
    transaction,
  });

  return Number(result?.totalWeightage || 0);
}

export async function getMarksTableBySubject(filters) {
  const { subjectId, classSectionTermId } = filters;

  const classSectionTerm = await scoped(model.classSectionTermModel).findOne({
    where: { classSectionTermId },
    attributes: ["classSectionTermId", "term", "classSectionsId"],
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        attributes: ["classSectionsId", "courseId", "sessionId", "section"],
        required: false,
        include: [
          {
            model: model.courseModel,
            as: "courseSection",
            attributes: ["courseId", "courseName", "courseCode"],
            required: false,
            include: [
              {
                model: model.departmentModel,
                as: "courseProgram",
                attributes: ["departmentId", "departmentName"],
                required: false,
              },
            ],
          },
          {
            model: model.sessionModel,
            as: "classSession",
            attributes: [
              "sessionId",
              "sessionName",
              "startingDate",
              "endingDate",
            ],
            required: false,
          },
        ],
      },
    ],
  });

  const subject = await scoped(model.subjectModel).findOne({
    where: { subjectId },
    attributes: ["subjectId", "subjectName", "subjectCode"],
  });

  const assessments = await scoped(model.internalAssessmentModel).findAll({
    where: {
      subjectId,
      classSectionTermId,
    },
    attributes: [
      "internalAssessmentId",
      "title",
      "weightage",
      "type",
      "maximumMarks",
      "dueDate",
      "issueDate",
      "mode",
      "weightagePercentage",
      "normalizedMaxMarks",
      "isIncludeInFinalResult",
    ],
    order: [
      ["issueDate", "ASC"],
      ["internalAssessmentId", "ASC"],
    ],
  });

  let sessionId = null;
  let course = null;
  let department = null;
  let section = null;
  let session = null;
  let term = null;

  if (classSectionTerm) {
    term = classSectionTerm.term;
    if (classSectionTerm.classSection) {
      sessionId = classSectionTerm.classSection.sessionId;
      section = classSectionTerm.classSection.section;
      if (classSectionTerm.classSection.courseSection) {
        const plainCourse = classSectionTerm.classSection.courseSection.get({
          plain: true,
        });
        course = {
          courseId: plainCourse.courseId,
          courseName: plainCourse.courseName,
          courseCode: plainCourse.courseCode,
        };
        department = plainCourse.courseProgram
          ? {
              departmentId: plainCourse.courseProgram.departmentId,
              departmentName: plainCourse.courseProgram.departmentName,
            }
          : null;
      }
      if (classSectionTerm.classSection.classSession) {
        session = classSectionTerm.classSection.classSession.get({
          plain: true,
        });
      }
    }
  }

  let studentCount = 0;
  if (sessionId) {
    const studentResult = await getStudentsByClassSectionTermId(
      classSectionTermId,
    );
    studentCount = studentResult.total;
  }

  const assessmentList = [];
  for (const assessment of assessments) {
    assessmentList.push(assessment.get({ plain: true }));
  }

  return {
    subjectId,
    classSectionTermId,
    term,
    section,
    studentCount,
    subject: subject ? subject.get({ plain: true }) : null,
    course,
    department,
    session,
    assessments: assessmentList,
  };
}

export async function getMarksCellBySubject(filters) {
  const { subjectId, classSectionTermId, page, limit } = filters;

  const assessments = await scoped(model.internalAssessmentModel).findAll({
    where: {
      subjectId,
      classSectionTermId,
    },
    attributes: [
      "internalAssessmentId",
      "title",
      "type",
      "maximumMarks",
      "issueDate",
      "dueDate",
      "mode",
      "documentUrl",
    ],
    order: [
      ["issueDate", "ASC"],
      ["internalAssessmentId", "ASC"],
    ],
  });

  const studentQuery = {};
  if (page && limit) {
    studentQuery.page = page;
    studentQuery.limit = limit;
  }

  const { students, total } = await getStudentsByClassSectionTermId(
    classSectionTermId,
    studentQuery,
  );

  const assessmentIds = [];
  const assessmentColumns = [];
  for (const assessment of assessments) {
    const plain = assessment.get({ plain: true });
    assessmentIds.push(plain.internalAssessmentId);
    assessmentColumns.push(plain);
  }

  const plainStudents = [];
  const studentIds = [];
  for (const student of students) {
    const plain = student.get({ plain: true });
    plainStudents.push(plain);
    studentIds.push(plain.studentId);
  }

  const evaluationByStudentAndAssessment = new Map();

  if (assessmentIds.length > 0 && studentIds.length > 0) {
    const evaluations = await scoped(
      model.internalAssessmentStudentEvaluationModel,
    ).findAll({
      where: {
        internalAssessmentId: { [Op.in]: assessmentIds },
        studentId: { [Op.in]: studentIds },
      },
      attributes: studentEvaluationAttributes,
    });

    for (const evaluation of evaluations) {
      const plain = evaluation.get({ plain: true });
      const key = `${plain.studentId}:${plain.internalAssessmentId}`;
      evaluationByStudentAndAssessment.set(key, {
        internalAssessmentStudentEvaluationId:
          plain.internalAssessmentStudentEvaluationId,
        studentId: plain.studentId,
        internalAssessmentId: plain.internalAssessmentId,
        obtainedMarks: plain.obtainedMarks,
        documentUrl: plain.documentUrl,
        updatedAt: plain.updatedAt,
      });
    }
  }

  const assessmentsWithStudents = [];

  for (const assessment of assessmentColumns) {
    const assessmentStudents = [];

    for (const plainStudent of plainStudents) {
      const key = `${plainStudent.studentId}:${assessment.internalAssessmentId}`;
      const evaluation = evaluationByStudentAndAssessment.get(key);

      assessmentStudents.push({
        studentId: plainStudent.studentId,
        scholarNumber: plainStudent.scholarNumber,
        enrollNumber: plainStudent.enrollNumber,
        firstName: plainStudent.firstName,
        middleName: plainStudent.middleName,
        lastName: plainStudent.lastName,
        internalAssessmentStudentEvaluationId: evaluation
          ? evaluation.internalAssessmentStudentEvaluationId
          : null,
        obtainedMarks: evaluation ? evaluation.obtainedMarks : null,
        documentUrl: evaluation ? evaluation.documentUrl : null,
        updatedAt: evaluation ? evaluation.updatedAt : null,
      });
    }

    assessmentsWithStudents.push({
      ...assessment,
      students: assessmentStudents,
    });
  }

  const response = {
    subjectId,
    classSectionTermId,
    studentCount: total,
    assessments: assessmentsWithStudents,
  };

  if (page && limit) {
    response.pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
    };
  }

  return response;
}

export async function getStudentEvaluationByStudentAndAssessment(filters) {
  const { subjectId, classSectionTermId, studentId, internalAssessmentId } =
    filters;

  const assessment = await scoped(model.internalAssessmentModel).findOne({
    where: {
      internalAssessmentId,
      subjectId,
      classSectionTermId,
    },
    attributes: [
      "internalAssessmentId",
      "subjectId",
      "classSectionTermId",
      "title",
      "type",
      "maximumMarks",
      "mode",
      "issueDate",
      "dueDate",
      "documentUrl",
    ],
  });

  if (!assessment) {
    return null;
  }

  const evaluation = await scoped(
    model.internalAssessmentStudentEvaluationModel,
  ).findOne({
    where: {
      studentId,
      internalAssessmentId,
    },
    attributes: studentEvaluationAttributes,
    include: [
      {
        model: model.studentModel,
        as: "student",
        attributes: studentAttributes,
        required: false,
      },
    ],
  });

  const plainAssessment = assessment.get({ plain: true });

  if (!evaluation) {
    return {
      ...plainAssessment,
      evaluation: {
        internalAssessmentStudentEvaluationId: null,
        studentId,
        internalAssessmentId,
        obtainedMarks: null,
        documentUrl: null,
        updatedAt: null,
        student: null,
      },
    };
  }

  return {
    ...plainAssessment,
    evaluation: evaluation.get({ plain: true }),
  };
}

export async function getStudentEvaluationsByAssessmentId(
  internalAssessmentId,
  studentId,
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

  const evaluationWhere = { internalAssessmentId };
  if (studentId) {
    evaluationWhere.studentId = studentId;
  }

  const evaluations = await scoped(
    model.internalAssessmentStudentEvaluationModel,
  ).findAll({
    where: evaluationWhere,
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
  options = {},
) {
  const { transaction, page, limit } = options;

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
    return { students: [], total: 0 };
  }

  const sessionId = classSectionTerm.classSection.sessionId;
  const query = {
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
  };

  if (page && limit) {
    query.limit = limit;
    query.offset = (page - 1) * limit;

    const result = await scoped(model.studentModel).findAndCountAll(query);
    return {
      students: result.rows,
      total: result.count,
    };
  }

  const students = await scoped(model.studentModel).findAll(query);
  return {
    students,
    total: students.length,
  };
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
  for (const row of rows) {
    const where = {
      internalAssessmentId: Number(row.internalAssessmentId),
      studentId: Number(row.studentId),
    };

    const existingRows = await scoped(
      model.internalAssessmentStudentEvaluationModel,
    ).findAll({
      where,
      attributes: [
        "internalAssessmentStudentEvaluationId",
        "obtainedMarks",
      ],
      order: [["internalAssessmentStudentEvaluationId", "ASC"]],
      transaction,
    });

    if (!existingRows.length) {
      await scoped(model.internalAssessmentStudentEvaluationModel).create(
        row,
        { transaction },
      );
      continue;
    }

    let keep = existingRows[existingRows.length - 1];
    for (let i = existingRows.length - 1; i >= 0; i -= 1) {
      if (
        existingRows[i].obtainedMarks !== null &&
        existingRows[i].obtainedMarks !== undefined
      ) {
        keep = existingRows[i];
        break;
      }
    }

    await scoped(model.internalAssessmentStudentEvaluationModel).update(
      { obtainedMarks: row.obtainedMarks },
      {
        where: {
          internalAssessmentStudentEvaluationId:
            keep.internalAssessmentStudentEvaluationId,
        },
        transaction,
      },
    );

    const duplicateIds = [];
    for (const existing of existingRows) {
      if (
        existing.internalAssessmentStudentEvaluationId !==
        keep.internalAssessmentStudentEvaluationId
      ) {
        duplicateIds.push(existing.internalAssessmentStudentEvaluationId);
      }
    }

    if (duplicateIds.length) {
      await scoped(model.internalAssessmentStudentEvaluationModel).destroy({
        where: {
          internalAssessmentStudentEvaluationId: { [Op.in]: duplicateIds },
        },
        transaction,
      });
    }
  }
}
