'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add batch_id to academic_regulation table
    const regTableInfo = await queryInterface.describeTable('academic_regulation');
    if (!regTableInfo.batch_id && !regTableInfo.batchId) {
      await queryInterface.addColumn('academic_regulation', 'batch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'batch',
          key: 'batch_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    // 2. Add batch_id to academic_regulation_course_mapping table
    const mappingTableInfo = await queryInterface.describeTable('academic_regulation_course_mapping');
    if (!mappingTableInfo.batch_id && !mappingTableInfo.batchId) {
      await queryInterface.addColumn('academic_regulation_course_mapping', 'batch_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'batch',
          key: 'batch_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const mappingTableInfo = await queryInterface.describeTable('academic_regulation_course_mapping');
    if (mappingTableInfo.batch_id || mappingTableInfo.batchId) {
      await queryInterface.removeColumn('academic_regulation_course_mapping', 'batch_id');
    }

    const regTableInfo = await queryInterface.describeTable('academic_regulation');
    if (regTableInfo.batch_id || regTableInfo.batchId) {
      await queryInterface.removeColumn('academic_regulation', 'batch_id');
    }
  }
};
