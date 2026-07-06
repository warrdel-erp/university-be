import sequelize from '../database/sequelizeConfig.js';
import * as classSectionTermRepository from '../repository/classSectionTermRepository.js';

export async function deleteClassSectionTerm(classSectionId) {
  return sequelize.transaction(async (transaction) => {
    const options = { transaction };
    const termRows = await classSectionTermRepository.findClassSectionTermsByClassSectionId(
      classSectionId,
      options,
    );
    if (termRows === null) {
      throw new Error('classSectionId not found');
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
        throw new Error(
          'Remove or reassign students before deleting this section.',
        );
      }

      const routineCount = await classSectionTermRepository.countTimetableRoutinesForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      if (routineCount > 0) {
        throw new Error(
          'Remove timetable routines before deleting this section.',
        );
      }
    }

    await classSectionTermRepository.softDeleteTeacherSectionMappingsForClassSection(
      classSectionId,
      options,
    );

    let deletedTermCount = 0;
    if (classSectionTermIds.length > 0) {
      deletedTermCount = await classSectionTermRepository.deleteClassSectionTermsByClassSectionId(
        classSectionId,
        options,
      );
      if (deletedTermCount === null) {
        throw new Error('classSectionId not found');
      }
    }

    const classSectionDeleted = await classSectionTermRepository.deleteClassSectionById(
      classSectionId,
      options,
    );
    if (!classSectionDeleted) {
      throw new Error('classSectionId not found');
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
