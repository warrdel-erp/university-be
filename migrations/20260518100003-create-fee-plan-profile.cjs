'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fee_plan_profile', {
      fee_plan_profile_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      plan_type: {
        type: Sequelize.ENUM('annual', 'semester', 'trimester'),
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      course_session_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'session_course_mapping', key: 'session_course_mapping_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'institute', key: 'institute_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    }, { charset: 'latin1', collate: 'latin1_swedish_ci' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fee_plan_profile');
  },
};
