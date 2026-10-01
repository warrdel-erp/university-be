'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [mappings] = await queryInterface.sequelize.query(
      `SELECT academic_regulation_course_mapping_id, academic_regulation_id, course_id, session_id, institute_id, university_id, created_by, updated_by
       FROM academic_regulation_course_mapping
       WHERE batch_id IS NULL;`
    );

    for (const mapping of mappings) {
      const mappingId = mapping.academic_regulation_course_mapping_id;
      const regulationId = mapping.academic_regulation_id;
      const sessionId = mapping.session_id;
      const courseId = mapping.course_id;
      const instituteId = mapping.institute_id;
      const universityId = mapping.university_id;
      const createdBy = mapping.created_by;
      const updatedBy = mapping.updated_by;

      let batches = [];

      // 1. Find batches directly linked to this session
      if (sessionId) {
        const [sessionBatches] = await queryInterface.sequelize.query(
          'SELECT batch_id FROM batch WHERE session_id = ? ORDER BY batch_id ASC;',
          { replacements: [sessionId] }
        );
        batches = sessionBatches;
      }

      // 2. Fallback: Find batches linked to this course via session
      if ((!batches || batches.length === 0) && courseId) {
        const [courseBatches] = await queryInterface.sequelize.query(
          `SELECT b.batch_id 
           FROM batch b 
           JOIN session s ON b.session_id = s.session_id 
           WHERE s.course_id = ? 
           ORDER BY b.batch_id ASC;`,
          { replacements: [courseId] }
        );
        batches = courseBatches;
      }

      if (batches && batches.length > 0) {
        const firstBatchId = batches[0].batch_id;

        // Update the current mapping record with the first batch
        await queryInterface.sequelize.query(
          'UPDATE academic_regulation_course_mapping SET batch_id = ? WHERE academic_regulation_course_mapping_id = ?;',
          { replacements: [firstBatchId, mappingId] }
        );

        // Update academic_regulation.batch_id if still null
        await queryInterface.sequelize.query(
          'UPDATE academic_regulation SET batch_id = ? WHERE academic_regulation_id = ? AND batch_id IS NULL;',
          { replacements: [firstBatchId, regulationId] }
        );

        // If multiple batches exist for that session, insert rows for the remaining batches
        for (let i = 1; i < batches.length; i++) {
          const subsequentBatchId = batches[i].batch_id;
          await queryInterface.sequelize.query(
            `INSERT INTO academic_regulation_course_mapping 
             (academic_regulation_id, batch_id, course_id, session_id, institute_id, university_id, created_by, updated_by, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW());`,
            { replacements: [regulationId, subsequentBatchId, courseId, sessionId, instituteId, universityId, createdBy, updatedBy] }
          );
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      'UPDATE academic_regulation_course_mapping SET batch_id = NULL;'
    );
    await queryInterface.sequelize.query(
      'UPDATE academic_regulation SET batch_id = NULL;'
    );
  }
};
