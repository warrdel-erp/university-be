'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('event_log', {
      event_log_id: {
        type: Sequelize.BIGINT,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      event_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'event',
          key: 'event_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      entity: {
        type: Sequelize.STRING(100),
        allowNull: false,
      },
      entity_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      action: {
        type: Sequelize.ENUM('CREATE', 'UPDATE', 'DELETE', 'BULK_CREATE', 'BULK_UPDATE', 'BULK_DELETE'),
        allowNull: false,
      },
      old_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      new_data: {
        type: Sequelize.JSON,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Add indexes
    await queryInterface.addIndex('event_log', ['event_id']);
    await queryInterface.addIndex('event_log', ['entity', 'entity_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('event_log');
  },
};
