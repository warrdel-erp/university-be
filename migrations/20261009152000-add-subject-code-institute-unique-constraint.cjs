'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Find all duplicates based on subject_code and institute_id
      const [duplicates] = await queryInterface.sequelize.query(`
        SELECT subject_code, institute_id, COUNT(*) as count
        FROM subject
        GROUP BY subject_code, institute_id
        HAVING count > 1
      `, { transaction });

      if (duplicates.length > 0) {
        // Find all tables referencing subject
        const dbName = queryInterface.sequelize.config.database;
        const [fks] = await queryInterface.sequelize.query(`
          SELECT TABLE_NAME, COLUMN_NAME
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
          WHERE REFERENCED_TABLE_SCHEMA = '${dbName}'
            AND REFERENCED_TABLE_NAME = 'subject'
            AND REFERENCED_COLUMN_NAME = 'subject_id';
        `, { transaction });

        for (const dup of duplicates) {
          // Get all subject_ids for this duplicate group, prioritizing active ones
          const [subjects] = await queryInterface.sequelize.query(`
            SELECT subject_id
            FROM subject
            WHERE subject_code = :subjectCode 
              AND institute_id = :instituteId
            ORDER BY 
              CASE WHEN deleted_at IS NULL THEN 0 ELSE 1 END ASC,
              subject_id ASC
          `, {
            replacements: {
              subjectCode: dup.subject_code,
              instituteId: dup.institute_id
            },
            transaction 
          });

          if (subjects.length > 1) {
            const keepSubjectId = subjects[0].subject_id;
            const duplicateSubjectIds = subjects.slice(1).map(s => s.subject_id);
            const idsString = duplicateSubjectIds.join(',');

            // Update referencing tables
            for (const fk of fks) {
              const tableName = fk.TABLE_NAME;
              const columnName = fk.COLUMN_NAME;
              
              // Using UPDATE IGNORE to avoid unique constraint violations
              await queryInterface.sequelize.query(`
                UPDATE IGNORE \`${tableName}\` 
                SET \`${columnName}\` = ${keepSubjectId} 
                WHERE \`${columnName}\` IN (${idsString})
              `, { transaction });
              
              // Delete remaining rows that were ignored because of unique constraint violations
              await queryInterface.sequelize.query(`
                DELETE FROM \`${tableName}\` 
                WHERE \`${columnName}\` IN (${idsString})
              `, { transaction });
            }

            // Hard delete the duplicate subjects
            await queryInterface.sequelize.query(`
              DELETE FROM subject WHERE subject_id IN (${idsString})
            `, { transaction });
          }
        }
      }

      // Add unique constraint
      await queryInterface.addIndex('subject', ['subject_code', 'institute_id'], {
        unique: true,
        name: 'unique_subject_code_institute_id',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error("Migration failed:", error);
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.removeIndex('subject', 'unique_subject_code_institute_id', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
