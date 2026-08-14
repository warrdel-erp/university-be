import * as examStructureRepository from "../repository/examStructureRepository.js";
import * as examScheduleRepository from "../repository/examScheduleRepository.js";
import * as studentHallTicketRepository from "../repository/studentHallTicketRepository.js";

export async function addExamStructure(examDetail, createdBy, updatedBy) {
  examDetail.createdBy = createdBy;
  examDetail.updatedBy = updatedBy;
  return await examStructureRepository.addExamStructure(examDetail);
}

export async function getExamStructure(academicYearId) {
  return await examStructureRepository.getExamStructure(academicYearId);
}

export async function getSingleExamStructure(
  courseId,
  sessionId,
  academicYearId,
) {
  return await examStructureRepository.getSingleExamStructure(
    courseId,
    sessionId,
    academicYearId,
  );
}

export async function deleteExamStructure(examStructureId) {
  return await examStructureRepository.deleteExamStructure(examStructureId);
}

export async function updateExamStructure(
  examStructureId,
  examDetail,
  updatedBy,
) {
  examDetail.updatedBy = updatedBy;
  await examStructureRepository.updateExamStructure(
    examStructureId,
    examDetail,
  );
}

export async function addExamType(examDetail, user) {
  const payload = { ...examDetail };
  delete payload.scheduledBy;

  if (typeof user === "object" && user !== null) {
    payload.createdBy = user.userId || payload.createdBy;
    payload.updatedBy = user.userId || payload.updatedBy;
    payload.universityId = user.universityId || payload.universityId;
    payload.instituteId = user.instituteId || payload.instituteId;
  } else {
    payload.createdBy = user;
    payload.updatedBy = user;
  }

  return await examStructureRepository.addExamType(payload);
}

export async function getDetailByExamType(examSetupTypeId) {
  return await examStructureRepository.getDetailByExamType(examSetupTypeId);
}

function toPlain(row) {
  if (!row) return null;
  return typeof row.toJSON === "function" ? row.toJSON() : row;
}

function resolveTerm(termNumber) {
  if (termNumber != null && termNumber !== "") {
    const parsed = Number(termNumber);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function collectTermIds(rows) {
  return [];
}

/** One count per unique session + course + term + academic year (not per exam type row). */
async function buildStudentCountMap(
  rows,
  sessionId,
  courseId,
  academicYearId,
  termNumber,
) {
  const countMap = new Map();
  if (!sessionId || !courseId) {
    return countMap;
  }

  const pending = [];
  for (const row of rows) {
    const plain = toPlain(row);
    const term = resolveTerm(termNumber);
    const yearId = academicYearId ?? plain.examStructure?.academicYearId;
    if (term == null || yearId == null) {
      continue;
    }

    const key = `${term}:${yearId}`;
    if (!countMap.has(key)) {
      pending.push(
        examScheduleRepository
          .getStudentCountByGroup(sessionId, courseId, term, yearId)
          .then((count) => countMap.set(key, count)),
      );
    }
  }

  await Promise.all(pending);
  return countMap;
}

function resolveStudentCount(
  plain,
  sessionId,
  courseId,
  academicYearId,
  termNumber,
  countMap,
) {
  if (!sessionId || !courseId) {
    return 0;
  }
  const term = resolveTerm(termNumber);
  const yearId = academicYearId ?? plain.examStructure?.academicYearId;
  if (term == null || yearId == null) {
    return 0;
  }
  return countMap.get(`${term}:${yearId}`) ?? 0;
}

export async function getAllExamTypes(
  academicYearId,
  termNumber,
  options = {},
) {
  const result = await examStructureRepository.getAllExamTypes(
    academicYearId,
    termNumber,
    options,
  );

  const rows = result.rows || [];
  if (!rows.length) {
    return {
      data: [],
      meta: {
        page: Number(options.page) || 1,
        limit: Number(options.limit) || 10,
        total: 0,
        totalPage: 0,
      },
    };
  }

  const termIds = collectTermIds(rows);
  const hallTicketCountByTermId = termIds.length
    ? await studentHallTicketRepository.countHallTicketsByTermIds(termIds, null)
    : new Map();

  const formattedData = rows.map((row) => {
    const plain = toPlain(row);

    return {
      ...plain,
      studentCount: 0,
      isHallTicketGenerated: false,
    };
  });

  return {
    data: formattedData,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPage: result.totalPages,
    },
  };
}

export async function deleteExamType(examSetupTypeId) {
  return await examStructureRepository.deleteExamType(examSetupTypeId);
}

export async function updateExamType(examSetupTypeId, examDetail, updatedBy) {
  examDetail.updatedBy = updatedBy;
  await examStructureRepository.updateExamType(examSetupTypeId, examDetail);
}
