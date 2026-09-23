import sequelize from '../database/sequelizeConfig.js';
import * as classSectionTermRepository from '../repository/classSectionTermRepository.js';
import * as batchRepository from '../repository/batchRepository.js';
import { resolveActiveAcademicYearContext } from '../utility/curriculumSubjectsByActiveYear.js';
import {
  buildTermName,
  monthsPerTermFromTermType,
  resolveTotalTerms,
  termsForYear,
  termsPerYear,
  yearFromTerm,
} from '../utility/courseTerms.js';

function formatAcademicYearLabel(calendarYear) {
  const start = Number(calendarYear);
  return `${start}-${String(start + 1).slice(-2)}`;
}

function resolveCurrentTermSlotInYear({ startingDate, termType, perYear, referenceDate }) {
  const start = new Date(startingDate);
  const monthsElapsed =
    (referenceDate.getFullYear() - start.getFullYear()) * 12 +
    (referenceDate.getMonth() - start.getMonth());
  const safeMonths = monthsElapsed < 0 ? 0 : monthsElapsed;
  const monthsPerTerm = monthsPerTermFromTermType(termType);
  const slot = Math.floor(safeMonths / monthsPerTerm);
  if (slot < 0) return 0;
  if (slot >= perYear) return perYear - 1;
  return slot;
}

export async function getBatchAcademicProgression(batchId) {
  const resolvedBatchId = Number(batchId);

  const [batchRow, academicCtx] = await Promise.all([
    batchRepository.findById(resolvedBatchId),
    resolveActiveAcademicYearContext(),
  ]);

  if (!batchRow) {
    throw new Error(`Batch (ID: ${resolvedBatchId}) not found`);
  }

  const batch = batchRow.get({ plain: true });
  const session = batch.session;
  if (!session || !session.course) {
    throw new Error(`Batch (ID: ${resolvedBatchId}) is missing session or course`);
  }
  const course = session.course;

  const batchYear = Number(batch.batch);
  const duration = Number(course.courseDuration) || 0;
  const totalTerms = resolveTotalTerms(course);
  const perYear = termsPerYear(course);
  const activeCalendarYear = Number(academicCtx.activeBatchYear);
  const academicYear = academicCtx.academicYear?.get
    ? academicCtx.academicYear.get({ plain: true })
    : academicCtx.academicYear;
  const currentYearNumber = activeCalendarYear - batchYear + 1;

  const configuredTermNumbers =
    await classSectionTermRepository.findConfiguredTermNumbersByBatchId(resolvedBatchId);

  const expectedTermsInCurrentYear =
    currentYearNumber >= 1 && currentYearNumber <= duration
      ? termsForYear(currentYearNumber, course)
      : [];

  let currentTermNumber = null;
  if (expectedTermsInCurrentYear.length > 0) {
    const slot = resolveCurrentTermSlotInYear({
      startingDate: academicYear.startingDate,
      termType: course.termType,
      perYear,
      referenceDate: new Date(),
    });
    const clampedSlot =
      slot < expectedTermsInCurrentYear.length ? slot : expectedTermsInCurrentYear.length - 1;
    currentTermNumber = expectedTermsInCurrentYear[clampedSlot];
  }

  const terms = [];
  let unverifiedHistoricalCount = 0;

  for (let term = 1; term <= totalTerms; term++) {
    const yearNumber = yearFromTerm(term, course);
    const academicCalendarYear = batchYear + (yearNumber - 1);
    const academicYearLabel = formatAcademicYearLabel(academicCalendarYear);
    const isConfigured = configuredTermNumbers.has(term);
    const configurationStatus = isConfigured ? 'Verified' : 'Unverified';

    let status;
    if (currentTermNumber != null && term === currentTermNumber) {
      status = 'Current';
    } else if (
      academicCalendarYear < activeCalendarYear ||
      (academicCalendarYear === activeCalendarYear &&
        currentTermNumber != null &&
        term < currentTermNumber)
    ) {
      status = 'Historical';
    } else {
      status = 'Future';
    }

    if (status === 'Historical' && !isConfigured) {
      unverifiedHistoricalCount += 1;
    }

    terms.push({
      term,
      termName: buildTermName(course.termType, term),
      year: yearNumber,
      academicYear: academicYearLabel,
      academicCalendarYear,
      status,
      configurationStatus,
      configured: isConfigured,
    });
  }

  const expectedCurrentTerm =
    currentTermNumber != null
      ? {
          term: currentTermNumber,
          termName: buildTermName(course.termType, currentTermNumber),
          year: currentYearNumber,
          academicYear: formatAcademicYearLabel(activeCalendarYear),
        }
      : null;

  const endBatchYear = duration > 0 ? batchYear + duration : batchYear;

  return {
    batch: {
      batchId: Number(batch.batchId),
      batch: batchYear,
      admissionBatch: `${batchYear}-${String(endBatchYear).slice(-2)}`,
      admissionYear: formatAcademicYearLabel(batchYear),
      status: batch.status,
      intakeCapacity: batch.intakeCapacity,
      setupStatus: unverifiedHistoricalCount > 0 ? 'Needs Setup' : 'Configured',
    },
    course: {
      courseId: course.courseId,
      courseName: course.courseName,
      courseCode: course.courseCode,
      termType: course.termType,
      duration,
      totalTerms,
      termRange: {
        from: totalTerms > 0 ? buildTermName(course.termType, 1) : null,
        to: totalTerms > 0 ? buildTermName(course.termType, totalTerms) : null,
      },
    },
    session: {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
    },
    currentAcademicPosition: {
      academicYear: formatAcademicYearLabel(activeCalendarYear),
      academicCalendarYear: activeCalendarYear,
      academicYearId: academicCtx.academicYearId,
      yearTitle: academicYear?.yearTitle || null,
      expectedCurrentTerm,
      basedOn: `Based on admission year ${formatAcademicYearLabel(batchYear)} and programme structure (${duration} years, ${buildTermName(course.termType, 1)} – ${buildTermName(course.termType, totalTerms)}).`,
    },
    terms,
  };
}

export async function renameClassSection(classSectionId, section) {
  const sectionName = String(section).trim();
  if (!sectionName) {
    throw new Error('section is required');
  }

  const classSectionRow = await classSectionTermRepository.findClassSectionInTenantScope(classSectionId);
  if (!classSectionRow) {
    throw new Error('classSectionId not found');
  }

  const plain = classSectionRow.get ? classSectionRow.get({ plain: true }) : classSectionRow;

  if (plain.section === sectionName) {
    return {
      classSectionId: Number(classSectionId),
      classSectionsId: plain.classSectionsId,
      section: sectionName,
      year: plain.year,
      courseId: plain.courseId,
      sessionId: plain.sessionId,
    };
  }

  const duplicate = await classSectionTermRepository.findClassSectionByCourseSessionYearSection({
    courseId: plain.courseId,
    sessionId: plain.sessionId,
    year: plain.year,
    section: sectionName,
    batchId: plain.batchId,
    excludeClassSectionsId: classSectionId,
  });
  if (duplicate) {
    throw new Error(
      'A class section with this name already exists for the same course, session, and year',
    );
  }

  const updated = await classSectionTermRepository.updateClassSectionName(
    classSectionId,
    sectionName,
  );
  if (!updated) {
    throw new Error('classSectionId not found');
  }

  return {
    classSectionId: Number(classSectionId),
    classSectionsId: plain.classSectionsId,
    section: sectionName,
    year: plain.year,
    courseId: plain.courseId,
    sessionId: plain.sessionId,
  };
}

export async function deleteClassSectionTerm(classSectionId) {
  return sequelize.transaction(async (transaction) => {
    const options = { transaction };
    const termRows = await classSectionTermRepository.findClassSectionTermsByClassSectionId(
      classSectionId,
      options,
    );
    if (termRows === null) {
      throw new Error('Class section not found.');
    }

    const classSectionTermIds = [];
    for (const termRow of termRows) {
      classSectionTermIds.push(termRow.classSectionTermId);
    }

    if (classSectionTermIds.length > 0) {
      const studentCount = await classSectionTermRepository.countStudentsForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      if (studentCount > 0) {
        throw new Error('Remove or reassign students before deleting this section.');
      }
    }

    const deletedTeacherMappingCount = await classSectionTermRepository.deleteTeacherSectionMappingsByClassSectionId(
      classSectionId,
      options,
    );

    let deletedTimetableCellCount = 0;
    let deletedTimetableRoutineCount = 0;
    if (classSectionTermIds.length > 0) {
      deletedTimetableCellCount = await classSectionTermRepository.deleteTimetableCellsForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      deletedTimetableRoutineCount = await classSectionTermRepository.deleteTimetableRoutinesForClassSectionTerms(
        classSectionTermIds,
        options,
      );
    }

    let deletedTermCount = 0;
    if (classSectionTermIds.length > 0) {
      deletedTermCount = await classSectionTermRepository.deleteClassSectionTermsByClassSectionId(
        classSectionId,
        options,
      );
      if (deletedTermCount === null) {
        throw new Error('Class section not found.');
      }
    }

    const classSectionDeleted = await classSectionTermRepository.deleteClassSectionById(
      classSectionId,
      options,
    );
    if (!classSectionDeleted) {
      throw new Error('Class section not found.');
    }

    return {
      success: true,
      message: 'Class section deleted successfully.',
      classSectionId: Number(classSectionId),
      deletedCount: deletedTermCount,
      deletedTeacherMappingCount,
      deletedTimetableCellCount,
      deletedTimetableRoutineCount,
      classSectionDeleted: true,
    };
  });
}
