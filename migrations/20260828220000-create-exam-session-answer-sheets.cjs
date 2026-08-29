'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('exam_session_answer_sheets', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      examination_session_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: { model: 'examination_session', key: 'examination_session_id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      s3_file_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: { model: 's3_files', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      institute_id: { type: Sequelize.BIGINT, allowNull: false },
      university_id: { type: Sequelize.BIGINT, allowNull: false },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'user_id' },
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
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('exam_session_answer_sheets');
  },
};
