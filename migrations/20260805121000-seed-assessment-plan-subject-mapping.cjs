'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // Fetch all active subject mappings
    const [mappings] = await sequelize.query(
      `SELECT * FROM assessment_plan_subject_mapping WHERE deleted_at IS NULL`
    );

    for (const row of mappings) {
      // 1. Fetch academicYearId from subject table
      const [subjRows] = await sequelize.query(
        `SELECT acedmic_year_id FROM subject WHERE subject_id = ? LIMIT 1`,
        { replacements: [row.subject_id] }
      );
      const subjectAcademicYearId = subjRows[0]?.acedmic_year_id || null;

      // 2. Fetch examSetupTypeId and component academicYearId from assessment_plan_component table
      const [compRows] = await sequelize.query(
        `SELECT exam_setup_type_id, acedmic_year_id FROM assessment_plan_component WHERE assessment_plan_id = ? AND deleted_at IS NULL LIMIT 1`,
        { replacements: [row.assessment_plan_id] }
      );
      const examSetupTypeId = compRows[0]?.exam_setup_type_id || null;
      const componentAcademicYearId = compRows[0]?.acedmic_year_id || null;

      const finalAcademicYearId = subjectAcademicYearId || componentAcademicYearId || row.acedmic_year_id || null;
      const finalExamSetupTypeId = examSetupTypeId || row.exam_setup_type_id || null;

      // 3. Fetch all mapped session_ids for courseId from session_course_mapping table
      const [scRows] = await sequelize.query(
        `SELECT session_id FROM session_course_mapping WHERE course_id = ?`,
        { replacements: [row.course_id] }
      );

      const mappedSessionIds = scRows.map(s => s.session_id).filter(Boolean);
      const targetSessionIds = [...new Set([...mappedSessionIds, row.session_id].filter(Boolean))];

      if (targetSessionIds.length === 0) {
        // Just update existing row if no sessions mapped
        await sequelize.query(
          `UPDATE assessment_plan_subject_mapping 
           SET acedmic_year_id = ?, exam_setup_type_id = ? 
           WHERE assessment_plan_subject_mapping_id = ?`,
          { replacements: [finalAcademicYearId, finalExamSetupTypeId, row.assessment_plan_subject_mapping_id] }
        );
        continue;
      }

      // Update existing record with the first session_id
      const firstSessionId = targetSessionIds[0];
      await sequelize.query(
        `UPDATE assessment_plan_subject_mapping 
         SET session_id = ?, acedmic_year_id = ?, exam_setup_type_id = ? 
         WHERE assessment_plan_subject_mapping_id = ?`,
        { replacements: [firstSessionId, finalAcademicYearId, finalExamSetupTypeId, row.assessment_plan_subject_mapping_id] }
      );

      // For additional session_ids, create new entries
      for (let i = 1; i < targetSessionIds.length; i++) {
        const extraSessionId = targetSessionIds[i];

        // Check if mapping entry already exists for (subject_id, course_id, session_id, assessment_plan_id)
        const [existingEntry] = await sequelize.query(
          `SELECT assessment_plan_subject_mapping_id FROM assessment_plan_subject_mapping 
           WHERE subject_id = ? AND course_id = ? AND session_id = ? AND assessment_plan_id = ? AND deleted_at IS NULL LIMIT 1`,
          { replacements: [row.subject_id, row.course_id, extraSessionId, row.assessment_plan_id] }
        );

        if (!existingEntry || existingEntry.length === 0) {
          await sequelize.query(
            `INSERT INTO assessment_plan_subject_mapping 
             (assessment_plan_id, subject_id, course_id, session_id, acedmic_year_id, exam_setup_type_id, university_id, institute_id, created_by, updated_by, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            {
              replacements: [
                row.assessment_plan_id,
                row.subject_id,
                row.course_id,
                extraSessionId,
                finalAcademicYearId,
                finalExamSetupTypeId,
                row.university_id,
                row.institute_id,
                row.created_by,
                row.updated_by
              ]
            }
          );
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert seed migration if necessary
  }
};
