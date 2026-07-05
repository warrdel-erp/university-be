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
      const teacherMappingCount = await classSectionTermRepository.countTeacherMappingsForClassSectionTerms(
        classSectionId,
        classSectionTermIds,
        options,
      );
      if (teacherMappingCount > 0) {
        throw new Error(
          'Teacher employee mapping exists for this class section. Please remove teacher section mapping (DELETE/PATCH /teacher/teacherSection) and timetable teacher mappings (DELETE /timeTableCreate/mapping) before deleting.',
        );
      }

      const studentCount = await classSectionTermRepository.countStudentsForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      if (studentCount > 0) {
        throw new Error(
          'Cannot delete this class section because students are assigned to one or more terms. Remove or reassign students first.',
        );
      }

      const routineCount = await classSectionTermRepository.countTimetableRoutinesForClassSectionTerms(
        classSectionTermIds,
        options,
      );
      if (routineCount > 0) {
        throw new Error(
          'Cannot delete this class section because timetable routines exist for one or more terms. Remove those routines before deleting.',
        );
      }
    }

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
