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

        // 0. Permanently delete connected data first to satisfy FK constraints
        
        // Delete 2nd-level dependencies
        await queryInterface.sequelize.query(`DELETE FROM student_fee_invoice_items WHERE student_fee_invoice_id IN (SELECT student_fee_invoice_id FROM student_fee_invoice WHERE student_id IN (${studentIdsStr}))`, { transaction });
        await queryInterface.sequelize.query(`DELETE FROM library_book_issue_inventory_item WHERE library_book_inventory_id IN (SELECT library_book_inventory_id FROM library_book_inventory WHERE student_id IN (${studentIdsStr}))`, { transaction });
        await queryInterface.sequelize.query(`DELETE FROM answer_sheet_annotation WHERE answer_sheet_qr_id IN (SELECT answer_sheet_qr_id FROM answer_sheet_qr WHERE student_id IN (${studentIdsStr}))`, { transaction });

        // Delete 1st-level dependencies
        const tablesWithStudentId = [
          'user_student_employee', 'subject_mapper', 'students_meta_data', 'students_entrance_detail',
          'students_address', 'student_result_item', 'student_result', 'student_invoice_mapper__deprecated',
          'student_hall_ticket', 'student_fee_invoice', 'student_exam_seat', 'student_elective_subject',
          'student_cor_address', 'student_class_sections_history', 'library_book_inventory',
          'internal_assessment_student_evaluation', 'fee_policy_students', 'examination_session_eligibility',
          'exam_attendance', 'attendance', 'assessment_evalution', 'answer_sheet_qr', 'academic_group_student'
        ];

        for (const table of tablesWithStudentId) {
          await queryInterface.sequelize.query(`DELETE FROM ${table} WHERE student_id IN (${studentIdsStr})`, { transaction });
        }

        // 1. Permanently delete the connected soft-deleted students first
        await queryInterface.bulkDelete('students', {
          student_id: {
            [Sequelize.Op.in]: studentIds
          }
        }, { transaction });

        // 2. Permanently delete connected permissions to satisfy FK constraints on users
        await queryInterface.bulkDelete('user_role_permission', {
          user_id: {
            [Sequelize.Op.in]: userIds
          }
        }, { transaction });

        // 3. Permanently delete the user records for these soft-deleted students.
        await queryInterface.bulkDelete('users', {
          user_id: {
            [Sequelize.Op.in]: userIds
          }
        }, { transaction });

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
