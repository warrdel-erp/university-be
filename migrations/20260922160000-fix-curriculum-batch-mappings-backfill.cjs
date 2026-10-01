'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // 1. Find unresolved mappings
      const [unresolvedMappings] = await queryInterface.sequelize.query(`
        SELECT curriculum_batch_mapping_id, curriculum_id, batch, created_by
        FROM curriculum_batch_mapping
        WHERE session_batch_mapping_id IS NULL
      `, { transaction: t });

      console.log(`Found ${unresolvedMappings.length} unresolved curriculum mappings to backfill.`);

      for (const mapping of unresolvedMappings) {
        // Find course_id for this curriculum
        const [curriculums] = await queryInterface.sequelize.query(`
          SELECT course_id FROM curriculum WHERE curriculum_id = ?
        `, { replacements: [mapping.curriculum_id], transaction: t });

        if (curriculums.length === 0 || !curriculums[0].course_id) continue;
        const courseId = curriculums[0].course_id;

        // Find session_ids for this course
        const [sessionMappings] = await queryInterface.sequelize.query(`
          SELECT session_id FROM session_course_mapping WHERE course_id = ?
        `, { replacements: [courseId], transaction: t });
        
        const sessionIds = sessionMappings.map(s => s.session_id);

        let matchingSessionBatches = [];
        if (sessionIds.length > 0) {
          const [sbmRows] = await queryInterface.sequelize.query(`
            SELECT session_batch_mapping_id FROM session_batch_mapping
            WHERE session_id IN (?) AND batch = ?
          `, { replacements: [sessionIds, mapping.batch], transaction: t });
          matchingSessionBatches = sbmRows;
        }

        if (matchingSessionBatches.length > 0) {
          console.log(`Curriculum Mapping ID ${mapping.curriculum_batch_mapping_id} (batch ${mapping.batch}) has ${matchingSessionBatches.length} session candidate(s). Creating distinct mappings...`);
          
          for (const sbm of matchingSessionBatches) {
            const [exists] = await queryInterface.sequelize.query(`
              SELECT 1 FROM curriculum_batch_mapping
              WHERE curriculum_id = ? AND session_batch_mapping_id = ?
            `, { replacements: [mapping.curriculum_id, sbm.session_batch_mapping_id], transaction: t });

            if (exists.length === 0) {
              await queryInterface.sequelize.query(`
                INSERT INTO curriculum_batch_mapping (curriculum_id, batch, session_batch_mapping_id, created_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, NOW(), NOW())
              `, { 
                replacements: [mapping.curriculum_id, mapping.batch, sbm.session_batch_mapping_id, mapping.created_by],
                transaction: t 
              });
            }
          }
          
          await queryInterface.sequelize.query(`
            DELETE FROM curriculum_batch_mapping WHERE curriculum_batch_mapping_id = ?
          `, { replacements: [mapping.curriculum_batch_mapping_id], transaction: t });
          
        } else {
          console.log(`Curriculum Mapping ID ${mapping.curriculum_batch_mapping_id} has 0 session candidates. Cannot auto-resolve. Removing it to satisfy NOT NULL constraints.`);
          await queryInterface.sequelize.query(`
            DELETE FROM curriculum_batch_mapping WHERE curriculum_batch_mapping_id = ?
          `, { replacements: [mapping.curriculum_batch_mapping_id], transaction: t });
        }
      }
    });
  },

  down: async (queryInterface, Sequelize) => {}
};
