'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('subject_mapper');

    if (!tableDesc.university_id) {
      await queryInterface.addColumn('subject_mapper', 'university_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'university',
          key: 'university_id'
        }
      });
    }

    if (!tableDesc.institute_id) {
      await queryInterface.addColumn('subject_mapper', 'institute_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'institute',
          key: 'institute_id'
        }
      });
    }

    if (!tableDesc.acedmic_year_id) {
      await queryInterface.addColumn('subject_mapper', 'acedmic_year_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'acedmic_year',
          key: 'acedmic_year_id'
        }
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE subject_mapper sm
      JOIN subject s ON sm.subject_id = s.subject_id
      SET 
        sm.university_id = s.university_id,
        sm.institute_id = s.institute_id,
        sm.acedmic_year_id = s.acedmic_year_id
    `);
  },

  async down (queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('subject_mapper');
    
    if (tableDesc.university_id) {
      await queryInterface.removeColumn('subject_mapper', 'university_id');
    }
    if (tableDesc.institute_id) {
      await queryInterface.removeColumn('subject_mapper', 'institute_id');
    }
    if (tableDesc.acedmic_year_id) {
      await queryInterface.removeColumn('subject_mapper', 'acedmic_year_id');
    }
  }
};
