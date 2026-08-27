'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    const [mappings] = await sequelize.query(
      `SELECT * FROM assessment_plan_subject_mapping WHERE deleted_at IS NULL`
    );

    for (const row of mappings) {
      const [subjRows] = await sequelize.query(
        `SELECT course_id, acedmic_year_id FROM subject WHERE subject_id = ? LIMIT 1`,
        { replacements: [row.subject_id] }
      );
      const subject = subjRows[0] || {};
      const targetCourseId = subject.course_id || row.course_id;
      const targetAcademicYearId = subject.acedmic_year_id || row.acedmic_year_id;

      const [planRows] = await sequelize.query(
        `SELECT session_id, acedmic_year_id FROM assessment_plan WHERE assessment_plan_id = ? LIMIT 1`,
        { replacements: [row.assessment_plan_id] }
      );
      const plan = planRows[0] || {};

      const [scRows] = await sequelize.query(
        `SELECT session_id FROM session_course_mapping WHERE course_id = ?`,
        { replacements: [targetCourseId] }
      );
      const scSessionIds = scRows.map(s => s.session_id).filter(Boolean);

      const targetSessionIds = [...new Set([...scSessionIds, plan.session_id, row.session_id].filter(Boolean))];

      for (const targetSessionId of targetSessionIds) {
        const [existing] = await sequelize.query(
          `SELECT assessment_plan_subject_mapping_id FROM assessment_plan_subject_mapping 
           WHERE subject_id = ? AND course_id = ? AND session_id = ? AND assessment_plan_id = ? AND deleted_at IS NULL LIMIT 1`,
          { replacements: [row.subject_id, targetCourseId, targetSessionId, row.assessment_plan_id] }
        );

        if (!existing || existing.length === 0) {
          try {
            await sequelize.query(
              `INSERT INTO assessment_plan_subject_mapping 
               (assessment_plan_id, subject_id, course_id, session_id, acedmic_year_id, exam_setup_type_id, university_id, institute_id, created_by, updated_by, created_at, updated_at) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE course_id = VALUES(course_id), acedmic_year_id = VALUES(acedmic_year_id)`,
              {
                replacements: [
                  row.assessment_plan_id,
                  row.subject_id,
                  targetCourseId,
                  targetSessionId,
                  targetAcademicYearId,
                  row.exam_setup_type_id,
                  row.university_id,
                  row.institute_id,
                  row.created_by,
                  row.updated_by
                ]
              }
            );
          } catch (err) {
            // Ignore duplicate key error safely
          }
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Revert migration if necessary
  }
};
