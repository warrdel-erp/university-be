import { Op } from "sequelize";
import * as model from "../models/index.js";
import { scoped } from "../utility/scoped.js";

function examEnrollmentInclude(sessionId, courseId, term, academicYearId) {
  const sectionWhere = {
    sessionId: Number(sessionId),
    courseId: Number(courseId),
    academicYearId: Number(academicYearId),
  };

  return {
    model: model.classSectionTermModel,
    as: "studentClassSectionTerm",
    attributes: [],
    required: true,
    where: { term: Number(term) },
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

export async function countTermCohortStudents(group, options = {}) {
  const where = {
    sessionId: Number(group.sessionId),
    courseId: Number(group.courseId),
  };

  return scoped(model.studentModel).count({
    where,
    include: [
      examEnrollmentInclude(
        group.sessionId,
        group.courseId,
        group.term,
        group.academicYearId,
      ),
    ],
    distinct: true,
    col: "student_id",
    transaction: options.transaction,
  });
}

export async function findTermCohortStudents(group, options = {}) {
  const where = {
    sessionId: Number(group.sessionId),
    courseId: Number(group.courseId),
  };
  if (options.search) {
    const like = `%${options.search}%`;
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
      "classSectionTermId",
      "batchYear",
    ],
    where,
    include: [
      examEnrollmentInclude(
        group.sessionId,
        group.courseId,
        group.term,
        group.academicYearId,
      ),
      {
        model: model.courseModel,
        as: "course",
        attributes: ["courseId", "courseName", "termType"],
        required: false,
      },
    ],
    order: [["firstName", "ASC"]],
    transaction: options.transaction,
  };

  if (options.page != null && options.limit != null) {
    query.offset = (Number(options.page) - 1) * Number(options.limit);
    query.limit = Number(options.limit);
    query.distinct = true;
    query.col = "student_id";
    const { count, rows } = await scoped(model.studentModel).findAndCountAll(query);
    return { rows, totalCount: count };
  }

  return scoped(model.studentModel).findAll(query);
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

export async function expandClassSectionTermIdsByTerms(
  terms,
  academicYearId,
  options = {},
) {
  const termNumbers = [...new Set(terms.map(Number))];
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
    classSectionTermIdList.push(Number(row.classSectionTermId));
    expandedGroups.push({
      classSectionTermId: Number(row.classSectionTermId),
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

export async function expandWholeTermClassSectionTermIds(
  classSectionTermIds,
  options = {},
) {
  const seedIds = [...new Set(classSectionTermIds.map(Number))];
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

  const seedGroups = [];
  const terms = new Set();
  const sectionOr = [];
  const seenSection = new Set();

  for (const row of seedTerms) {
    const plain = row.get({ plain: true });
    const term = Number(plain.term);
    const courseId = Number(plain.classSection.courseId);
    const sessionId = Number(plain.classSection.sessionId);
    const academicYearId = Number(plain.classSection.academicYearId);
    terms.add(term);
    seedGroups.push({
      classSectionTermId: Number(plain.classSectionTermId),
      term,
      courseId,
      sessionId,
      academicYearId,
    });

    const sectionKey = `${courseId}_${sessionId}_${academicYearId}`;
    if (seenSection.has(sectionKey)) continue;
    seenSection.add(sectionKey);
    sectionOr.push({ courseId, sessionId, academicYearId });
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
        where: { [Op.or]: sectionOr },
      },
    ],
    transaction: options.transaction,
  });

  const classSectionTermIdList = [];
  const expandedGroups = [];
  for (const row of expanded) {
    classSectionTermIdList.push(Number(row.classSectionTermId));
    expandedGroups.push({
      classSectionTermId: Number(row.classSectionTermId),
      term: Number(row.term),
      courseId: Number(row.classSection.courseId),
      sessionId: Number(row.classSection.sessionId),
      academicYearId: Number(row.classSection.academicYearId),
    });
  }

  return {
    classSectionTermIds: classSectionTermIdList,
    seedGroups,
    expandedGroups,
  };
}

export async function countWholeTermStudentsByTerms(
  terms,
  academicYearId,
  options = {},
) {
  const termNumbers = [...new Set(terms.map(Number))];
  if (!termNumbers.length || !academicYearId) return 0;

  return countStudentsByTermAndSections(
    termNumbers,
    [{ academicYearId: Number(academicYearId) }],
    options,
  );
}

export async function countWholeTermStudentsByClassSectionTermIds(
  classSectionTermIds,
  options = {},
) {
  const seedIds = [...new Set(classSectionTermIds.map(Number))];
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
