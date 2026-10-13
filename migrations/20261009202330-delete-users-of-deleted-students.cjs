'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Find all user_ids associated with soft-deleted students
      const [students] = await queryInterface.sequelize.query(
        `SELECT student_id, user_id FROM students WHERE deleted_at IS NOT NULL AND user_id IS NOT NULL;`,
        { transaction }
      );

      const userIds = students.map(s => s.user_id);
      const studentIds = students.map(s => s.student_id);

      if (userIds.length > 0 && studentIds.length > 0) {
        const studentIdsStr = studentIds.join(',');

        // Fetch existing tables in the database to avoid errors on environments with varying schemas
        const [existingTables] = await queryInterface.sequelize.query(
          `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();`,
          { transaction }
        );
        const existingTableSet = new Set(existingTables.map(t => t.TABLE_NAME));

        // 0. Permanently delete connected 2nd-level data first to satisfy FK constraints
        if (existingTableSet.has('student_fee_invoice_items') && existingTableSet.has('student_fee_invoice')) {
          await queryInterface.sequelize.query(
            `DELETE FROM student_fee_invoice_items WHERE student_fee_invoice_id IN (SELECT student_fee_invoice_id FROM student_fee_invoice WHERE student_id IN (${studentIdsStr}))`,
            { transaction }
          );
        }
        if (existingTableSet.has('library_book_issue_inventory_item') && existingTableSet.has('library_book_inventory')) {
          await queryInterface.sequelize.query(
            `DELETE FROM library_book_issue_inventory_item WHERE inventory_id IN (SELECT inventory_id FROM library_book_inventory WHERE student_id IN (${studentIdsStr}))`,
            { transaction }
          );
        }
        if (existingTableSet.has('answer_sheet_annotation') && existingTableSet.has('answer_sheet_qr')) {
          await queryInterface.sequelize.query(
            `DELETE FROM answer_sheet_annotation WHERE answer_sheet_qr_id IN (SELECT id FROM answer_sheet_qr WHERE student_id IN (${studentIdsStr}))`,
            { transaction }
          );
        }

        // Dynamically delete 1st-level dependencies referencing students(student_id)
        const [studentFks] = await queryInterface.sequelize.query(`
          SELECT DISTINCT TABLE_NAME, COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
            AND REFERENCED_TABLE_NAME = 'students'
            AND REFERENCED_COLUMN_NAME = 'student_id';
        `, { transaction });

        for (const { TABLE_NAME, COLUMN_NAME } of studentFks) {
          if (existingTableSet.has(TABLE_NAME) && TABLE_NAME !== 'students') {
            await queryInterface.sequelize.query(
              `DELETE FROM \`${TABLE_NAME}\` WHERE \`${COLUMN_NAME}\` IN (${studentIdsStr})`,
              { transaction }
            );
          }
        }

        // 1. Permanently delete the connected soft-deleted students first
        await queryInterface.bulkDelete('students', {
          student_id: {
            [Sequelize.Op.in]: studentIds
          }
        }, { transaction });

        // 2. Identify which user_ids are safe to delete.
        // A user MUST NOT be deleted if they are referenced anywhere else in the database
        // (e.g. employee, timetable teacher in time_table_cell_teachers, remaining students, etc.)
        const [userFks] = await queryInterface.sequelize.query(`
          SELECT DISTINCT kcu.TABLE_NAME, kcu.COLUMN_NAME
          FROM information_schema.KEY_COLUMN_USAGE kcu
          JOIN information_schema.REFERENTIAL_CONSTRAINTS rc 
            ON kcu.CONSTRAINT_NAME = rc.CONSTRAINT_NAME 
            AND kcu.CONSTRAINT_SCHEMA = rc.CONSTRAINT_SCHEMA
          WHERE kcu.REFERENCED_TABLE_NAME = 'users'
            AND kcu.REFERENCED_COLUMN_NAME = 'user_id'
            AND kcu.CONSTRAINT_SCHEMA = DATABASE()
            AND rc.DELETE_RULE IN ('RESTRICT', 'NO ACTION')
            AND kcu.TABLE_NAME NOT IN ('user_role_permission', 'user_permissions');
        `, { transaction });

        const uniqueUserIds = [...new Set(userIds)];
        const uniqueUserIdsStr = uniqueUserIds.join(',');
        const inUseUserIds = new Set();

        for (const { TABLE_NAME, COLUMN_NAME } of userFks) {
          if (!existingTableSet.has(TABLE_NAME)) continue;
          const [rows] = await queryInterface.sequelize.query(`
            SELECT DISTINCT \`${COLUMN_NAME}\` as user_id
            FROM \`${TABLE_NAME}\`
            WHERE \`${COLUMN_NAME}\` IN (${uniqueUserIdsStr});
          `, { transaction });
          for (const row of rows) {
            inUseUserIds.add(row.user_id);
          }
        }

        const safeUserIds = uniqueUserIds.filter(id => !inUseUserIds.has(id));

        if (safeUserIds.length > 0) {
          // 3. Permanently delete connected permissions for safe users
          if (existingTableSet.has('user_role_permission')) {
            await queryInterface.bulkDelete('user_role_permission', {
              user_id: {
                [Sequelize.Op.in]: safeUserIds
              }
            }, { transaction });
          }

          // 4. Permanently delete the user records for safe-to-delete users
          await queryInterface.bulkDelete('users', {
            user_id: {
              [Sequelize.Op.in]: safeUserIds
            }
          }, { transaction });
        }

      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Reverting this migration is not possible as the data is permanently deleted.");
  }
};
