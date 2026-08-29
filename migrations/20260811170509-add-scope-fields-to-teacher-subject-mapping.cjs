'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('teacher_subject_mapping');

    if (!tableDesc.university_id) {
      await queryInterface.addColumn('teacher_subject_mapping', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'university',
          key: 'university_id'
        }
      });
    }

    if (!tableDesc.institute_id) {
      await queryInterface.addColumn('teacher_subject_mapping', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'institute',
          key: 'institute_id'
        }
      });
    }

    if (!tableDesc.acedmic_year_id) {
      await queryInterface.addColumn('teacher_subject_mapping', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id'
        }
      });
    }

    // Backfill from subject table
    await queryInterface.sequelize.query(`
      UPDATE teacher_subject_mapping tsm
      JOIN subject s ON tsm.subject_id = s.subject_id
      SET 
        tsm.university_id = s.university_id,
        tsm.institute_id = s.institute_id,
        tsm.acedmic_year_id = s.acedmic_year_id
    `);
  },

  async down (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('teacher_subject_mapping');
    
    if (tableDesc.university_id) {
      await queryInterface.removeColumn('teacher_subject_mapping', 'university_id');
    }
    if (tableDesc.institute_id) {
      await queryInterface.removeColumn('teacher_subject_mapping', 'institute_id');
    }
    if (tableDesc.acedmic_year_id) {
      await queryInterface.removeColumn('teacher_subject_mapping', 'acedmic_year_id');
    }
  }
};
