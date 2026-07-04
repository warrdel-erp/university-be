import * as classSectionTermRepository from '../repository/classSectionTermRepository.js';

export async function deleteClassSectionTerm(classSectionTermId) {
  const termRow = await classSectionTermRepository.findClassSectionTermById(classSectionTermId);
  if (!termRow) {
    throw new Error('classSectionTermId not found');
  }

  const plain = termRow.get({ plain: true });
  const classSectionsId = plain.classSectionsId ?? Number(classSectionTermId);
  if (!classSectionsId) {
    throw new Error('classSectionsId could not be resolved for this class section term');
  }

  const teacherMappingCount = await classSectionTermRepository.countTeacherMappingsForClassSectionTerm(
    classSectionTermId,
    classSectionsId,
  );
  if (teacherMappingCount > 0) {
    throw new Error(
      'Teacher employee mapping exists for this class section term. Please remove teacher section mapping (DELETE/PATCH /teacher/teacherSection) and timetable teacher mappings (DELETE /timeTableCreate/mapping) before deleting.',
    );
  }

  const studentCount = await classSectionTermRepository.countStudentsForClassSectionTerm(
    classSectionTermId,
  );
  if (studentCount > 0) {
    throw new Error(
      'Cannot delete this class section term because students are assigned to it. Remove or reassign students first.',
    );
  }

  const deleted = await classSectionTermRepository.deleteClassSectionTermById(classSectionTermId);
  if (!deleted) {
    throw new Error('classSectionTermId not found');
  }

  return {
    success: true,
    message: 'Class section term deleted successfully.',
    classSectionTermId: Number(classSectionTermId),
  };
}
