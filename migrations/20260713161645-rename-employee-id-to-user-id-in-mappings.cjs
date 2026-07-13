'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ─── 1. Migrate teacher_section_mapping ─────────────────────────────────
    // Drop foreign key referencing employee
    await queryInterface.sequelize.query(`
      ALTER TABLE teacher_section_mapping 
      DROP FOREIGN KEY teacher_section_mapping_ibfk_1;
    `);

    // Add user_id column
    await queryInterface.addColumn('teacher_section_mapping', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Backfill user_id from employee table
    await queryInterface.sequelize.query(`
      UPDATE teacher_section_mapping t
      JOIN employee e ON e.employee_id = t.employee_id
      SET t.user_id = e.user_id
      WHERE t.employee_id IS NOT NULL AND t.user_id IS NULL;
    `);

    // In case there are orphan mapping rows that have no match in employee, 
    // or just to be safe before setting NOT NULL, delete them or set a fallback.
    await queryInterface.sequelize.query(`
      DELETE FROM teacher_section_mapping WHERE user_id IS NULL;
    `);

    // Make user_id NOT NULL
    await queryInterface.changeColumn('teacher_section_mapping', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Drop employee_id column
    await queryInterface.removeColumn('teacher_section_mapping', 'employee_id');


    // ─── 2. Migrate teacher_subject_mapping ─────────────────────────────────
    // Drop foreign key referencing employee
    await queryInterface.sequelize.query(`
      ALTER TABLE teacher_subject_mapping 
      DROP FOREIGN KEY teacher_subject_mapping_ibfk_2;
    `);

    // Add user_id column
    await queryInterface.addColumn('teacher_subject_mapping', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Backfill user_id from employee table
    await queryInterface.sequelize.query(`
      UPDATE teacher_subject_mapping t
      JOIN employee e ON e.employee_id = t.employee_id
      SET t.user_id = e.user_id
      WHERE t.employee_id IS NOT NULL AND t.user_id IS NULL;
    `);

    // Clean up orphans where user_id could not be resolved
    await queryInterface.sequelize.query(`
      DELETE FROM teacher_subject_mapping WHERE user_id IS NULL;
    `);

    // Make user_id NOT NULL
    await queryInterface.changeColumn('teacher_subject_mapping', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    // Drop employee_id column
    await queryInterface.removeColumn('teacher_subject_mapping', 'employee_id');
  },

  async down(queryInterface, Sequelize) {
    // ─── Revert teacher_subject_mapping ─────────────────────────────────────
    await queryInterface.addColumn('teacher_subject_mapping', 'employee_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'employee_id'
      }
    });

    await queryInterface.sequelize.query(`
      UPDATE teacher_subject_mapping t
      JOIN employee e ON e.user_id = t.user_id
      SET t.employee_id = e.employee_id;
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM teacher_subject_mapping WHERE employee_id IS NULL;
    `);

    await queryInterface.changeColumn('teacher_subject_mapping', 'employee_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'employee',
        key: 'employee_id'
      }
    });

    await queryInterface.removeColumn('teacher_subject_mapping', 'user_id');

    // ─── Revert teacher_section_mapping ─────────────────────────────────────
    await queryInterface.addColumn('teacher_section_mapping', 'employee_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'employee',
        key: 'employee_id'
      }
    });

    await queryInterface.sequelize.query(`
      UPDATE teacher_section_mapping t
      JOIN employee e ON e.user_id = t.user_id
      SET t.employee_id = e.employee_id;
    `);

    await queryInterface.sequelize.query(`
      DELETE FROM teacher_section_mapping WHERE employee_id IS NULL;
    `);

    await queryInterface.changeColumn('teacher_section_mapping', 'employee_id', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'employee',
        key: 'employee_id'
      }
    });

    await queryInterface.removeColumn('teacher_section_mapping', 'user_id');
  }
};
