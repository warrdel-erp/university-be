import * as classSectionTermRepository from '../repository/classSectionTermRepository.js';

export async function deleteClassSectionTerm(classSectionId) {
  const termRows = await classSectionTermRepository.findClassSectionTermsByClassSectionId(classSectionId);
  if (!termRows.length) {
    throw new Error('classSectionId not found');
  }

  const classSectionTermIds = [];
  for (const termRow of termRows) {
    classSectionTermIds.push(termRow.classSectionTermId);
  }

  const teacherMappingCount = await classSectionTermRepository.countTeacherMappingsForClassSectionTerms(
    classSectionId,
    classSectionTermIds,
  );
  if (teacherMappingCount > 0) {
    throw new Error(
      'Teacher employee mapping exists for this class section. Please remove teacher section mapping (DELETE/PATCH /teacher/teacherSection) and timetable teacher mappings (DELETE /timeTableCreate/mapping) before deleting.',
    );
  }

  const studentCount = await classSectionTermRepository.countStudentsForClassSectionTerms(classSectionTermIds);
  if (studentCount > 0) {
    throw new Error(
      'Cannot delete this class section because students are assigned to one or more terms. Remove or reassign students first.',
    );
  }

  const deleted = await classSectionTermRepository.deleteClassSectionTermsByClassSectionId(classSectionId);
  if (!deleted) {
    throw new Error('classSectionId not found');
  }

  return {
    success: true,
    message: 'Class section terms deleted successfully.',
    classSectionId: Number(classSectionId),
    deletedCount: deleted,
  };
}
