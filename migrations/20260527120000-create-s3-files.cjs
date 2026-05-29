'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('s3_files', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      company_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      size: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      mime: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM('pending', 'active'),
        allowNull: false,
        defaultValue: 'pending',
      },
      s3_key: {
        type: Sequelize.STRING(255),
        allowNull: false,
        unique: true,
      },
      original_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'user_id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('s3_files', ['company_id'], {
      name: 'idx_s3_files_company',
    });

    await queryInterface.addIndex('s3_files', ['entity_type', 'entity_id'], {
      name: 'idx_s3_files_entity',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('s3_files');
  },
};
