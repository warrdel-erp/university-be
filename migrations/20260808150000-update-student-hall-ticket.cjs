'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Delete all existing entries in student_hall_ticket
    await queryInterface.bulkDelete('student_hall_ticket', {}, { truncate: true, cascade: true });

    // 2. Remove legacy indexes safely using raw SQL
    try {
      await queryInterface.sequelize.query('ALTER TABLE student_hall_ticket DROP INDEX uq_student_hall_ticket_exam_session_student;');
    } catch (e) {}
    try {
      await queryInterface.sequelize.query('ALTER TABLE student_hall_ticket DROP INDEX student_hall_ticket_inst_univ_est_session_idx;');
    } catch (e) {}
    try {
      await queryInterface.sequelize.query('ALTER TABLE student_hall_ticket DROP INDEX student_hall_ticket_inst_univ_exam_session_idx;');
    } catch (e) {}

    // 3. Remove legacy columns safely
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'exam_setup_type_term_id');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'session_id');
    } catch (e) {}

    // 4. Add new columns if not present
    try {
      await queryInterface.addColumn('student_hall_ticket', 'examination_session_id', {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'examination_session',
          key: 'examination_session_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'is_blocked', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'is_published', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'published_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (e) {}

    try {
      await queryInterface.addColumn('student_hall_ticket', 'blocked_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
    } catch (e) {}

    // 5. Add new indexes
    try {
      await queryInterface.addIndex('student_hall_ticket', ['examination_session_id', 'student_id'], {
        unique: true,
        name: 'uq_student_hall_ticket_exam_session_student'
      });
    } catch (e) {
      console.log('Index uq_student_hall_ticket_exam_session_student already exists or failed to add:', e.message);
    }

    try {
      await queryInterface.addIndex('student_hall_ticket', ['institute_id', 'university_id', 'examination_session_id', 'acedmic_year_id'], {
        name: 'student_hall_ticket_inst_univ_exam_session_idx'
      });
    } catch (e) {
      console.log('Index student_hall_ticket_inst_univ_exam_session_idx already exists or failed to add:', e.message);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('student_hall_ticket', {}, { truncate: true, cascade: true });

    try {
      await queryInterface.sequelize.query('ALTER TABLE student_hall_ticket DROP INDEX uq_student_hall_ticket_exam_session_student;');
    } catch (e) {}
    try {
      await queryInterface.sequelize.query('ALTER TABLE student_hall_ticket DROP INDEX student_hall_ticket_inst_univ_exam_session_idx;');
    } catch (e) {}

    try {
      await queryInterface.removeColumn('student_hall_ticket', 'is_blocked');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'is_published');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'published_at');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'blocked_at');
    } catch (e) {}

    try {
      await queryInterface.removeColumn('student_hall_ticket', 'examination_session_id');
    } catch (e) {}
    try {
      await queryInterface.removeColumn('student_hall_ticket', 'acedmic_year_id');
    } catch (e) {}

    await queryInterface.addColumn('student_hall_ticket', 'exam_setup_type_term_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
    await queryInterface.addColumn('student_hall_ticket', 'session_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
