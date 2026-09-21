'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Split sessions mapped to multiple courses
      const [mappings] = await queryInterface.sequelize.query(`
        SELECT session_id, course_id
        FROM session_course_mapping
        ORDER BY session_id, session_course_mapping_id ASC
      `, { transaction });

      // Group courses by session
      const sessionCourses = {};
      for (const row of mappings) {
        if (!sessionCourses[row.session_id]) {
          sessionCourses[row.session_id] = [];
        }
        sessionCourses[row.session_id].push(row.course_id);
      }

      // Find tables that have both session_id and course_id to update
      const [fkTables] = await queryInterface.sequelize.query(`
        SELECT TABLE_NAME
        FROM information_schema.COLUMNS
        WHERE COLUMN_NAME = 'session_id' AND TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME IN (
          SELECT TABLE_NAME
          FROM information_schema.COLUMNS
          WHERE COLUMN_NAME = 'course_id' AND TABLE_SCHEMA = DATABASE()
        )
      `, { transaction });

      const tablesToUpdate = fkTables.map(t => t.TABLE_NAME).filter(t => t !== 'session_course_mapping');

      for (const [sessionIdStr, courseIds] of Object.entries(sessionCourses)) {
        const sessionId = parseInt(sessionIdStr, 10);
        
        // The first course keeps the original session
        const primaryCourseId = courseIds[0];
        
        await queryInterface.sequelize.query(`
          UPDATE session SET course_id = ? WHERE session_id = ?
        `, { replacements: [primaryCourseId, sessionId], transaction });

        // For other courses, duplicate the session
        for (let i = 1; i < courseIds.length; i++) {
          const courseId = courseIds[i];
          
          // Get original session data
          const [sessionRows] = await queryInterface.sequelize.query(`
            SELECT * FROM session WHERE session_id = ?
          `, { replacements: [sessionId], transaction });
          
          if (sessionRows.length === 0) continue;
          const origSession = sessionRows[0];
          
          // Insert cloned session
          const [insertResult] = await queryInterface.sequelize.query(`
            INSERT INTO session (
              university_id, acedmic_year_id, institute_id, session_name,
              starting_date, ending_date, class_til_date, created_at, updated_at,
              updated_by, created_by, deleted_at, course_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, {
            replacements: [
              origSession.university_id, origSession.acedmic_year_id, origSession.institute_id, origSession.session_name,
              origSession.starting_date, origSession.ending_date, origSession.class_til_date, origSession.created_at, origSession.updated_at,
              origSession.updated_by, origSession.created_by, origSession.deleted_at, courseId
            ],
            transaction
          });
          
          const newSessionId = insertResult; // insertId
          
          // Update dependent tables that have course_id
          for (const tableName of tablesToUpdate) {
            await queryInterface.sequelize.query(`
              UPDATE ${tableName}
              SET session_id = ?
              WHERE session_id = ? AND course_id = ?
            `, { replacements: [newSessionId, sessionId, courseId], transaction });
          }

          // Update the session_course_mapping table itself just to be clean
          await queryInterface.sequelize.query(`
            UPDATE session_course_mapping
            SET session_id = ?
            WHERE session_id = ? AND course_id = ?
          `, { replacements: [newSessionId, sessionId, courseId], transaction });
        }
      }

      // 2. Merge sessions with the same name and course_id
      // Group by course_id and session_name
      const [duplicates] = await queryInterface.sequelize.query(`
        SELECT course_id, session_name, MIN(session_id) as primary_session_id, GROUP_CONCAT(session_id) as all_session_ids
        FROM session
        WHERE course_id IS NOT NULL AND deleted_at IS NULL
        GROUP BY course_id, session_name
        HAVING COUNT(*) > 1
      `, { transaction });

      // Find ALL tables referencing session_id
      const [allSessionFks] = await queryInterface.sequelize.query(`
        SELECT TABLE_NAME, COLUMN_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_NAME = 'session' AND REFERENCED_COLUMN_NAME = 'session_id'
        AND TABLE_SCHEMA = DATABASE()
      `, { transaction });

      for (const row of duplicates) {
        const primarySessionId = row.primary_session_id;
        const allIds = row.all_session_ids.split(',').map(Number);
        const idsToReplace = allIds.filter(id => id !== primarySessionId);
        
        if (idsToReplace.length > 0) {
          for (const fk of allSessionFks) {
            // Use UPDATE IGNORE to prevent Unique Constraint Violations (Validation error)
            // if merging child rows creates a duplicate in tables with unique indexes (e.g. batch, student_result)
            await queryInterface.sequelize.query(`
              UPDATE IGNORE ${fk.TABLE_NAME}
              SET ${fk.COLUMN_NAME} = ?
              WHERE ${fk.COLUMN_NAME} IN (?)
            `, { replacements: [primarySessionId, idsToReplace], transaction });
          }

          // Soft delete the duplicated sessions
          await queryInterface.sequelize.query(`
            UPDATE session
            SET deleted_at = NOW()
            WHERE session_id IN (?)
          `, { replacements: [idsToReplace], transaction });
        }
      }

      // 3. Backfill active_year on class_sections
      // active_year = acedmic_year_title start year
      await queryInterface.sequelize.query(`
        UPDATE class_sections cs
        JOIN acedmic_year ay ON cs.acedmic_year_id = ay.acedmic_year_id
        SET cs.active_year = CAST(SUBSTRING_INDEX(ay.year_title, '-', 1) AS UNSIGNED)
        WHERE cs.active_year IS NULL AND cs.year IS NOT NULL
      `, { transaction });

      // Fallback for null years or non-parseable years
      await queryInterface.sequelize.query(`
        UPDATE class_sections
        SET active_year = 2026
        WHERE active_year IS NULL
      `, { transaction });

      // 4. Seed session_batch_mapping
      // batch = active_year - (year - 1)
      const [batchRows] = await queryInterface.sequelize.query(`
        SELECT DISTINCT session_id, (active_year - (COALESCE(year, 1) - 1)) as batch, created_by
        FROM class_sections
        WHERE session_id IS NOT NULL AND deleted_at IS NULL
      `, { transaction });

      for (const row of batchRows) {
        if (!row.session_id || !row.batch) continue;
        await queryInterface.sequelize.query(`
          INSERT IGNORE INTO session_batch_mapping (session_id, batch, created_by, created_at, updated_at)
          VALUES (?, ?, ?, NOW(), NOW())
        `, { replacements: [row.session_id, row.batch, row.created_by], transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse migration is destructive and not fully possible without losing merge data.
    // We will just clear the new columns/tables which is handled by the schema migration.
  }
};
