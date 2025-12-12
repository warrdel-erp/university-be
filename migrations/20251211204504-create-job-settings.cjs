'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.createTable('job_settings', {
        job_setting_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'university', key: 'university_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        institute_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'institute', key: 'institute_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        job_type_name: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        default_duration: { type: Sequelize.INTEGER },
        color_code: { type: Sequelize.STRING },
        is_active: { type: Sequelize.BOOLEAN, defaultValue: true },
        created_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' }
        },
        updated_by: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'user_id' }
        },
        created_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        updated_at: { type: Sequelize.DATE, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
        deleted_at: { type: Sequelize.DATE, allowNull: true }
      }, { transaction: t });
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.dropTable('job_settings', { transaction: t });
    });
  }
};
