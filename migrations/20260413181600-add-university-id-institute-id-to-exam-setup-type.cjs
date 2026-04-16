'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('exam_setup_type', 'university_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'university',
        key: 'university_id'
      }
    });

    await queryInterface.addColumn('exam_setup_type', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'institute',
        key: 'institute_id'
      }
    });

    // Populate existing data from exam_structure
    await queryInterface.sequelize.query(`
      UPDATE exam_setup_type est
      JOIN exam_structure es ON est.exam_structure_id = es.exam_structure_id
      SET est.university_id = es.university_id,
          est.institute_id = es.institute_id
    `);

    // Alter columns to NOT NULL after population
    await queryInterface.changeColumn('exam_setup_type', 'university_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn('exam_setup_type', 'institute_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('exam_setup_type', 'university_id');
    await queryInterface.removeColumn('exam_setup_type', 'institute_id');
  }
};
