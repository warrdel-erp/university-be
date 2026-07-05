import sequelize from '../database/sequelizeConfig.js';
import * as classSectionTermRepository from '../repository/classSectionTermRepository.js';

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
      const teacherMappingCount = await classSectionTermRepository.countTeacherMappingsForClassSectionTerms(
        classSectionId,
        classSectionTermIds,
        options,
      );
      if (teacherMappingCount > 0) {
        throw new Error('Remove teacher mapping before deleting this section.');
      }

      const studentCount = await classSectionTermRepository.countStudentsForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      if (studentCount > 0) {
        throw new Error('Remove or reassign students before deleting this section.');
      }

      const routineCount = await classSectionTermRepository.countTimetableRoutinesForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      if (routineCount > 0) {
        throw new Error('Remove timetable routines before deleting this section.');
      }
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
      classSectionDeleted: true,
    };
  });
}
