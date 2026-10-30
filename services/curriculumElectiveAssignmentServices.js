import { Op } from "sequelize";
import sequelize from "../database/sequelizeConfig.js";
import * as assignmentRepo from "../repository/curriculumElectiveAssignmentRepository.js";
import * as requirementRepo from "../repository/curriculumElectiveRequirementRepository.js";
import * as models from "../models/index.js";
import { requestContext } from "../utility/requestContext.js";

function httpError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

/**
 * Format a single assignment row for API output
 */
function formatAssignment(row, idx = 0, offset = 0) {
  const student = row.student;
  const studentName = student
    ? [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ")
    : "";
  const enrolmentNo =
    student?.enrollNumber ||
    student?.scholarNumber ||
    (student?.studentId ? `ENR${student.studentId}` : "-");
  const programme = student?.course?.courseName || null;
  const programmeCode = student?.course?.courseCode || null;
  const batch = student?.batch?.batch || null;
  const section = student?.studentClassSectionTerm?.classSection?.section || null;

  const subject = row.subject;
  const req = row.curriculumElectiveRequirement;

  return {
    srNo: offset + idx + 1,
    id: row.id,
    curriculumElectiveRequirementId: row.curriculumElectiveRequirementId,
    studentId: row.studentId,
    studentName,
    enrolmentNo,
    scholarNumber: student?.scholarNumber || null,
    enrollNumber: student?.enrollNumber || null,
    batch,
    programme,
    programmeCode,
    section,
    subjectId: row.subjectId,
    courseCode: subject?.subjectCode || "",
    courseTitle: subject?.subjectName || "",
    subjectName: subject?.subjectName || "",
    subjectCode: subject?.subjectCode || "",
    subjectType: subject?.subjectType || "",
    teachingType: subject?.subjectType || "",
    assignmentSource: row.assignmentSource || "Direct",
    status: row.status || "Assigned",
    statusBadge: {
      label: row.status || "Assigned",
      color:
        row.status === "Assigned"
          ? "green"
          : row.status === "Awaiting"
          ? "amber"
          : "red",
    },
    assignedAt: row.createdAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    student: student
      ? {
          studentId: student.studentId,
          fullName: studentName,
          firstName: student.firstName,
          middleName: student.middleName,
          lastName: student.lastName,
          scholarNumber: student.scholarNumber,
          enrollNumber: student.enrollNumber,
          batchId: student.batchId,
          batch,
          courseId: student.courseId,
          programme,
          programmeCode,
          section,
        }
      : null,
    subject: subject
      ? {
          subjectId: subject.subjectId,
          courseCode: subject.subjectCode,
          courseTitle: subject.subjectName,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          subjectType: subject.subjectType,
        }
      : null,
    requirement: req
      ? {
          id: req.id,
          curriculumId: req.curriculumId,
          requirementCode: req.requirementCode,
          requirementName: req.requirementName,
          term: req.term,
          coursesRequired: req.coursesRequired,
          minCredits: req.minCredits,
          category: req.curriculumCategory
            ? {
                id: req.curriculumCategory.id,
                categoryName: req.curriculumCategory.categoryName,
                code: req.curriculumCategory.code,
              }
            : null,
        }
      : null,
  };
}

/**
 * Get all curriculum elective assignments with filter criteria and pagination
 */
export async function getAllCurriculumElectiveAssignments(query = {}, options = {}) {
  const result = await assignmentRepo.findCurriculumElectiveAssignments(query, options);

  const limitVal =
    query.limit !== undefined && query.limit !== null && query.limit !== ""
      ? parseInt(query.limit, 10)
      : 10;
  const isAll = limitVal === -1 || String(query.limit).toLowerCase() === "all";
  const limit = isAll ? result.count : limitVal > 0 ? limitVal : 10;
  const page =
    query.page !== undefined && query.page !== null && query.page !== ""
      ? Math.max(1, parseInt(query.page, 10))
      : 1;
  const offset = isAll ? 0 : (page - 1) * limit;

  const formattedRows = (result.rows || []).map((row, idx) =>
    formatAssignment(row, idx, offset)
  );

  const total = result.count || 0;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

  const paginationData = {
    total,
    page,
    limit,
    totalPages,
  };

  // Optional courseInfo & summary when subjectId / requirementId is passed
  let courseInfo = null;
  let summary = null;

  const sId = parseInt(query.subjectId || query.subject_id, 10);
  if (sId && !isNaN(sId)) {
    const course = await models.subjectModel.findByPk(sId, {
      attributes: ["subjectId", "subjectName", "subjectCode", "subjectType"],
      transaction: options.transaction,
    });

    if (course) {
      const reqId = parseInt(
        query.curriculumElectiveRequirementId ||
          query.curriculum_elective_requirement_id ||
          query.requirementId ||
          query.id,
        10
      );
      let recognisedCredits = 3;
      let req = null;
      if (reqId && !isNaN(reqId)) {
        req = await requirementRepo.findCurriculumElectiveRequirementById(reqId, options);
        if (req?.curriculumId) {
          const cstm = await models.curriculumSubjectTermMappingModel.findOne({
            where: { curriculumId: req.curriculumId, subjectId: sId },
            attributes: ["credit"],
            transaction: options.transaction,
          });
          if (cstm?.credit != null) {
            recognisedCredits = cstm.credit;
          } else if (req.minCredits != null) {
            recognisedCredits = req.minCredits;
          }
        }
      }

      // Routine capacity
      const routineCells = await models.timeTableCellModel.findAll({
        where: { subjectId: sId },
        include: [
          {
            model: models.timeTableRoutineModel,
            as: "timeTableRoutine",
            attributes: ["timeTableRoutineId", "isPublish", "classSectionTermId"],
            include: [
              {
                model: models.classSectionTermModel,
                as: "timeTableClassSectionTerm",
                attributes: ["classSectionTermId", "classSectionsId"],
                include: [
                  {
                    model: models.classSectionModel,
                    as: "classSection",
                    attributes: ["classSectionsId", "expectedCapacity", "section"],
                  },
                ],
              },
            ],
          },
        ],
        transaction: options.transaction,
      });

      let totalCapacity = 0;
      const seenSections = new Set();
      for (const cell of routineCells) {
        const routine = cell.timeTableRoutine;
        if (routine?.classSectionTermId && !seenSections.has(routine.classSectionTermId)) {
          seenSections.add(routine.classSectionTermId);
          totalCapacity +=
            Number(routine?.timeTableClassSectionTerm?.classSection?.expectedCapacity) || 40;
        }
      }
      if (totalCapacity === 0) totalCapacity = 40;

      const enrolledSeatsAcrossAll = await assignmentRepo.countTotalSubjectEnrollments(
        sId,
        options
      );
      const enrolledSeats = Math.max(0, enrolledSeatsAcrossAll);
      const remainingSeats = Math.max(0, totalCapacity - enrolledSeats);
      const isFull = remainingSeats <= 0;

      courseInfo = {
        subjectId: course.subjectId,
        courseCode: course.subjectCode,
        courseTitle: course.subjectName,
        teachingType: course.subjectType || "Theoretical",
        recognisedCredits,
        seatOccupancy: {
          enrolledSeats,
          totalCapacity,
          remainingSeats,
          isFull,
          occupancyPercentage:
            totalCapacity > 0
              ? Number(((enrolledSeats / totalCapacity) * 100).toFixed(1))
              : 0,
          occupancyText: `${enrolledSeats} / ${totalCapacity}`,
          remainingText: `${remainingSeats} seats remaining`,
          status: isFull ? "Full" : "Available",
          badgeText: isFull ? "Full" : "Available",
          statusDescription: isFull ? "No seats available" : "Open for assignment",
        },
      };

      let totalAssignedToThisCourse = total;
      if (reqId) {
        totalAssignedToThisCourse = await assignmentRepo.countAssignmentsByRequirementAndSubject(
          reqId,
          sId,
          options
        );
      }

      let totalEligible = 0;
      if (req) {
        const allStudents = await requirementRepo.findEligibleStudentsForRequirement(
          req,
          { allBatchStudents: true },
          options
        );
        const activeAssignments = await assignmentRepo.findAssignmentsByRequirement(req.id, {
          transaction: options.transaction,
        });
        const assignedStudentIds = new Set(
          activeAssignments
            .filter((a) => a.status === "Assigned")
            .map((a) => a.studentId)
        );
        totalEligible = allStudents.filter((st) => !assignedStudentIds.has(st.studentId)).length;
      }

      summary = {
        totalAssignedToThisCourse,
        totalEligible,
        remainingSeats,
        canAssignMore: remainingSeats > 0,
      };
    }
  }

  return {
    rows: formattedRows,
    paginationData,
    courseInfo,
    summary,
  };
}

/**
 * Get single curriculum elective assignment by ID
 */
export async function getCurriculumElectiveAssignmentById(id, options = {}) {
  const row = await assignmentRepo.findCurriculumElectiveAssignmentById(id, options);
  if (!row) {
    throw httpError("Curriculum elective assignment not found", 404);
  }
  return formatAssignment(row, 0, 0);
}

/**
 * Assign a student to an elective course under a requirement
 */
export async function assignStudent(body = {}, options = {}) {
  const ctx = requestContext.get();
  const studentId = body.studentId || body.student_id;
  const subjectId = body.subjectId || body.subject_id;
  const curriculumElectiveRequirementId =
    body.curriculumElectiveRequirementId ||
    body.curriculum_elective_requirement_id ||
    body.requirementId;

  if (!studentId) throw httpError("studentId is required", 400);
  if (!subjectId) throw httpError("subjectId is required", 400);
  if (!curriculumElectiveRequirementId)
    throw httpError("curriculumElectiveRequirementId is required", 400);

  const req = await requirementRepo.findCurriculumElectiveRequirementById(
    curriculumElectiveRequirementId,
    options
  );
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const universityId =
    body.universityId || req.universityId || ctx?.universityId || ctx?.user?.universityId;
  const instituteId =
    body.instituteId || req.instituteId || ctx?.instituteId || ctx?.user?.defaultInstituteId;
  const academicYearId =
    body.academicYearId || req.academicYearId || ctx?.academicYearId || ctx?.user?.defaultAcademicYearId || null;
  const userId = ctx?.userId || ctx?.user?.userId || body.userId || null;

  const data = {
    curriculumElectiveRequirementId,
    studentId,
    subjectId,
    assignmentSource: body.assignmentSource || "Direct",
    status: body.status || "Assigned",
    universityId,
    instituteId,
    academicYearId,
    userId,
  };

  const assignment = await assignmentRepo.upsertAssignment(data, options);
  return {
    message: "Student assigned successfully",
    assignment,
  };
}

/**
 * Bulk assign students to elective course
 */
export async function bulkAssignStudents(body = {}, options = {}) {
  const ctx = requestContext.get();
  const { studentIds, subjectId, assignmentSource = "Direct" } = body;
  const curriculumElectiveRequirementId =
    body.curriculumElectiveRequirementId ||
    body.curriculum_elective_requirement_id ||
    body.requirementId;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw httpError("studentIds array cannot be empty", 400);
  }
  if (!subjectId) throw httpError("subjectId is required", 400);
  if (!curriculumElectiveRequirementId)
    throw httpError("curriculumElectiveRequirementId is required", 400);

  const req = await requirementRepo.findCurriculumElectiveRequirementById(
    curriculumElectiveRequirementId,
    options
  );
  if (!req) {
    throw httpError("Curriculum elective requirement not found", 404);
  }

  const universityId =
    body.universityId || req.universityId || ctx?.universityId || ctx?.user?.universityId;
  const instituteId =
    body.instituteId || req.instituteId || ctx?.instituteId || ctx?.user?.defaultInstituteId;
  const academicYearId =
    body.academicYearId || req.academicYearId || ctx?.academicYearId || ctx?.user?.defaultAcademicYearId || null;
  const userId = ctx?.userId || ctx?.user?.userId || body.userId || null;

  const records = studentIds.map((studentId) => ({
    curriculumElectiveRequirementId,
    studentId,
    subjectId,
    assignmentSource,
    status: "Assigned",
    universityId,
    instituteId,
    academicYearId,
    userId,
  }));

  const results = await assignmentRepo.bulkUpsertAssignments(records, options);
  return {
    message: `${results.length} students assigned successfully`,
    assignedCount: results.length,
    assignments: results,
  };
}

/**
 * Unassign student from an assignment by ID or requirement & student ID
 */
export async function unassignStudent(params = {}, options = {}) {
  const { id, curriculumElectiveRequirementId, studentId } = params;

  if (id) {
    const success = await assignmentRepo.deleteAssignmentById(id, options);
    if (!success) {
      throw httpError("Assignment record not found", 404);
    }
    return { message: "Student unassigned successfully" };
  }

  if (curriculumElectiveRequirementId && studentId) {
    const success = await assignmentRepo.unassignStudent(
      curriculumElectiveRequirementId,
      studentId,
      options
    );
    if (!success) {
      throw httpError("Assignment record not found", 404);
    }
    return { message: "Student unassigned successfully" };
  }

  throw httpError("Either id or curriculumElectiveRequirementId and studentId must be provided", 400);
}

/**
 * Bulk unassign students from requirement
 */
export async function bulkUnassignStudents(body = {}, options = {}) {
  const { curriculumElectiveRequirementId, studentIds } = body;
  if (!curriculumElectiveRequirementId) {
    throw httpError("curriculumElectiveRequirementId is required", 400);
  }
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    throw httpError("studentIds array cannot be empty", 400);
  }

  const deletedCount = await assignmentRepo.bulkUnassignStudents(
    curriculumElectiveRequirementId,
    studentIds,
    options
  );
  return {
    message: `${deletedCount} students unassigned successfully`,
    unassignedCount: deletedCount,
  };
}
