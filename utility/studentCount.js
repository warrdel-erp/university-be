import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as model from "../models/index.js";
import { scoped } from "./scoped.js";

function groupKey(sessionId, courseId, term, academicYearId) {
  return `${Number(sessionId)}_${Number(courseId)}_${Number(term)}_${Number(academicYearId)}`;
}

async function countStudentsByTermAndSections(termNumbers, sectionGroups, options = {}) {
  if (!termNumbers.length || !sectionGroups.length) return 0;

  return scoped(model.studentModel).count({
    distinct: true,
    col: "student_id",
    include: [
      {
        model: model.classSectionTermModel,
        as: "studentClassSectionTerm",
        required: true,
        attributes: [],
        where: { term: { [Op.in]: termNumbers } },
        include: [
          {
            model: model.classSectionModel,
            as: "classSection",
            required: true,
            attributes: [],
            where: { [Op.or]: sectionGroups },
          },
        ],
      },
    ],
    transaction: options.transaction,
  });
}

/**
 * Expand term numbers (+ academic year) to every CST in that year for those terms.
 */
export async function expandClassSectionTermIdsByTerms(
  terms,
  academicYearId,
  options = {},
) {
  const termNumbers = [
    ...new Set((terms || []).map(Number).filter((t) => t > 0)),
  ];
  if (!termNumbers.length || !academicYearId) {
    return { classSectionTermIds: [], seedGroups: [], expandedGroups: [] };
  }

  const expanded = await model.classSectionTermModel.findAll({
    attributes: ["classSectionTermId", "term"],
    where: { term: { [Op.in]: termNumbers } },
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        required: true,
        attributes: ["courseId", "sessionId", "academicYearId"],
        where: { academicYearId: Number(academicYearId) },
      },
    ],
    transaction: options.transaction,
  });

  const classSectionTermIdList = [];
  const expandedGroups = [];
  for (const row of expanded) {
    const classSectionTermId = Number(row.classSectionTermId);
    classSectionTermIdList.push(classSectionTermId);
    expandedGroups.push({
      classSectionTermId,
      term: Number(row.term),
      courseId: Number(row.classSection.courseId),
      sessionId: Number(row.classSection.sessionId),
      academicYearId: Number(row.classSection.academicYearId),
    });
  }

  return {
    classSectionTermIds: classSectionTermIdList,
    seedGroups: expandedGroups,
    expandedGroups,
  };
}

/**
 * Expand seed classSectionTermIds to every CST in the same
 * course + session + academic year + term (all sections).
 */
export async function expandWholeTermClassSectionTermIds(
  classSectionTermIds,
  options = {},
) {
  const seedIds = [
    ...new Set((classSectionTermIds || []).map(Number).filter((id) => id > 0)),
  ];
  if (!seedIds.length) {
    return { classSectionTermIds: [], seedGroups: [], expandedGroups: [] };
  }

  const seedTerms = await model.classSectionTermModel.findAll({
    where: { classSectionTermId: { [Op.in]: seedIds } },
    attributes: ["classSectionTermId", "term"],
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        required: true,
        attributes: ["courseId", "sessionId", "academicYearId"],
      },
    ],
    transaction: options.transaction,
  });
  if (!seedTerms.length) {
    return { classSectionTermIds: seedIds, seedGroups: [], expandedGroups: [] };
  }

  const terms = new Set();
  const sectionGroups = [];
  const sectionSeen = new Set();
  const seedGroups = [];

  for (const row of seedTerms) {
    const term = Number(row.term);
    const courseId = Number(row.classSection.courseId);
    const sessionId = Number(row.classSection.sessionId);
    const academicYearId = Number(row.classSection.academicYearId);
    terms.add(term);
    seedGroups.push({
      classSectionTermId: Number(row.classSectionTermId),
      term,
      courseId,
      sessionId,
      academicYearId,
    });

    const sectionKey = `${courseId}_${sessionId}_${academicYearId}`;
    if (!sectionSeen.has(sectionKey)) {
      sectionSeen.add(sectionKey);
      sectionGroups.push({ courseId, sessionId, academicYearId });
    }
  }

  const expanded = await model.classSectionTermModel.findAll({
    attributes: ["classSectionTermId", "term"],
    where: { term: { [Op.in]: [...terms] } },
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        required: true,
        attributes: ["courseId", "sessionId", "academicYearId"],
        where: { [Op.or]: sectionGroups },
      },
    ],
    transaction: options.transaction,
  });

  const classSectionTermIdList = [];
  const expandedGroups = [];
  for (const row of expanded) {
    const classSectionTermId = Number(row.classSectionTermId);
    classSectionTermIdList.push(classSectionTermId);
    expandedGroups.push({
      classSectionTermId,
      term: Number(row.term),
      courseId: Number(row.classSection.courseId),
      sessionId: Number(row.classSection.sessionId),
      academicYearId: Number(row.classSection.academicYearId),
    });
  }

  return {
    classSectionTermIds: classSectionTermIdList.length
      ? classSectionTermIdList
      : seedIds,
    seedGroups,
    expandedGroups,
  };
}

/** Whole-term student count from examination session term numbers + academic year. */
export async function countWholeTermStudentsByTerms(
  terms,
  academicYearId,
  options = {},
) {
  const termNumbers = [
    ...new Set((terms || []).map(Number).filter((t) => t > 0)),
  ];
  if (!termNumbers.length || !academicYearId) return 0;

  return countStudentsByTermAndSections(
    termNumbers,
    [{ academicYearId: Number(academicYearId) }],
    options,
  );
}

/** Whole-term student count from examinationSession classSectionTermIds. */
export async function countWholeTermStudentsByClassSectionTermIds(
  classSectionTermIds,
  options = {},
) {
  const seedIds = [
    ...new Set((classSectionTermIds || []).map(Number).filter((id) => id > 0)),
  ];
  if (!seedIds.length) return 0;

  const seedTerms = await model.classSectionTermModel.findAll({
    where: { classSectionTermId: { [Op.in]: seedIds } },
    attributes: ["term"],
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        required: true,
        attributes: ["courseId", "sessionId", "academicYearId"],
      },
    ],
    raw: true,
    nest: true,
    transaction: options.transaction,
  });
  if (!seedTerms.length) return 0;

  const terms = new Set();
  const sectionGroups = [];
  const seen = new Set();

  for (const row of seedTerms) {
    terms.add(Number(row.term));
    const { courseId, sessionId, academicYearId } = row.classSection;
    const key = `${courseId}_${sessionId}_${academicYearId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sectionGroups.push({ courseId, sessionId, academicYearId });
  }

  return countStudentsByTermAndSections([...terms], sectionGroups, options);
}

/**
 * Batch whole-term counts for schedule groups.
 * @returns Map<"session_course_term_year", number>
 */
export async function getStudentCountMapByGroups(groups, options = {}) {
  const countMap = new Map();
  const unique = [];
  const seen = new Set();

  for (const g of groups || []) {
    if (
      g.sessionId == null ||
      g.courseId == null ||
      g.term == null ||
      g.academicYearId == null
    ) {
      continue;
    }
    const key = groupKey(g.sessionId, g.courseId, g.term, g.academicYearId);
    if (seen.has(key)) continue;
    unique.push({
      sessionId: Number(g.sessionId),
      courseId: Number(g.courseId),
      term: Number(g.term),
      academicYearId: Number(g.academicYearId),
    });
    countMap.set(key, 0);
  }

  if (!unique.length) return countMap;

  const sessionIds = [...new Set(unique.map((g) => g.sessionId))];
  const courseIds = [...new Set(unique.map((g) => g.courseId))];
  const terms = [...new Set(unique.map((g) => g.term))];
  const academicYearIds = [...new Set(unique.map((g) => g.academicYearId))];

  const rows = await scoped(model.studentModel).findAll({
    attributes: [
      [sequelize.col("students.session_id"), "sessionId"],
      [sequelize.col("studentClassSectionTerm.term"), "term"],
      [sequelize.col("students.course_id"), "courseId"],
      [sequelize.col("studentClassSectionTerm->classSection.acedmic_year_id"), "academicYearId"],
      [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("students.student_id"))), "studentCount"],
    ],
    where: {
      sessionId: { [Op.in]: sessionIds },
      courseId: { [Op.in]: courseIds },
    },
    include: [
      {
        model: model.classSectionTermModel,
        as: "studentClassSectionTerm",
        attributes: [],
        required: true,
        where: { term: { [Op.in]: terms } },
        include: [
          {
            model: model.classSectionModel,
            as: "classSection",
            attributes: [],
            required: true,
            where: {
              sessionId: { [Op.in]: sessionIds },
              courseId: { [Op.in]: courseIds },
              academicYearId: { [Op.in]: academicYearIds },
            },
          },
        ],
      },
    ],
    group: [
      "students.session_id",
      "studentClassSectionTerm.term",
      "students.course_id",
      "studentClassSectionTerm->classSection.acedmic_year_id",
    ],
    raw: true,
    transaction: options.transaction,
  });

  for (const row of rows) {
    countMap.set(
      groupKey(row.sessionId, row.courseId, row.term, row.academicYearId),
      parseInt(row.studentCount, 10) || 0,
    );
  }

  return countMap;
}

export function lookupStudentCount(countMap, group) {
  if (!group) return 0;
  return (
    countMap.get(
      groupKey(group.sessionId, group.courseId, group.term, group.academicYearId),
    ) || 0
  );
}

function examEnrollmentInclude(sessionId, courseId, term, academicYearId) {
  const sectionWhere = { sessionId, courseId };
  if (academicYearId != null) {
    sectionWhere.academicYearId = academicYearId;
  }

  return {
    model: model.classSectionTermModel,
    as: "studentClassSectionTerm",
    attributes: [],
    required: true,
    where: { term },
    include: [
      {
        model: model.classSectionModel,
        as: "classSection",
        attributes: [],
        required: true,
        where: sectionWhere,
      },
    ],
  };
}

export async function countStudentsForExamGroup(
  sessionId,
  courseId,
  term,
  academicYearId,
  options = {},
) {
  const map = await getStudentCountMapByGroups(
    [{ sessionId, courseId, term, academicYearId }],
    options,
  );
  return lookupStudentCount(map, { sessionId, courseId, term, academicYearId });
}

export async function findStudentsForExamGroup(
  sessionId,
  courseId,
  term,
  academicYearId,
  options = {},
) {
  const { page, limit, search, transaction } = options;
  const where = {
    sessionId: Number(sessionId),
    courseId: Number(courseId),
  };
  if (search) {
    const like = `%${search}%`;
    where[Op.or] = [
      { firstName: { [Op.like]: like } },
      { lastName: { [Op.like]: like } },
      { middleName: { [Op.like]: like } },
      { scholarNumber: { [Op.like]: like } },
      { enrollNumber: { [Op.like]: like } },
      { fatherName: { [Op.like]: like } },
    ];
  }

  const query = {
    attributes: [
      "studentId",
      "firstName",
      "middleName",
      "lastName",
      "scholarNumber",
      "enrollNumber",
      "fatherName",
    ],
    where,
    include: [
      examEnrollmentInclude(sessionId, courseId, term, academicYearId),
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "termType"],
        required: false,
      },
    ],
    order: [["firstName", "ASC"]],
    transaction,
  };

  if (page != null && limit != null) {
    query.offset = (Number(page) - 1) * Number(limit);
    query.limit = Number(limit);
    query.distinct = true;
    query.col = "student_id";
    const { count, rows } = await scoped(model.studentModel).findAndCountAll(query);
    return { rows, totalCount: count };
  }

  return scoped(model.studentModel).findAll(query);
}
