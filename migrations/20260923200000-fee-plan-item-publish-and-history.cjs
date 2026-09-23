'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_item');

    if (!desc.publish_status) {
      await queryInterface.addColumn('fee_plan_item', 'publish_status', {
        type: Sequelize.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'draft',
      });
    }
    if (!desc.published_at) {
      await queryInterface.addColumn('fee_plan_item', 'published_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }
    if (!desc.published_by) {
      await queryInterface.addColumn('fee_plan_item', 'published_by', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    await queryInterface.createTable(
      'fee_plan_publish_history',
      {
        fee_plan_publish_history_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        batch_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'batch', key: 'batch_id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        year: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        action: {
          type: Sequelize.ENUM('publish', 'unpublish'),
          allowNull: false,
        },
        published_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        published_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        university_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
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
      },
      { charset: 'latin1', collate: 'latin1_swedish_ci' },
    );

    await queryInterface.addIndex('fee_plan_publish_history', ['batch_id', 'year'], {
      name: 'idx_fee_plan_publish_history_batch_year',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fee_plan_publish_history');

    const desc = await queryInterface.describeTable('fee_plan_item');
    if (desc.published_by) {
      await queryInterface.removeColumn('fee_plan_item', 'published_by');
    }
    if (desc.published_at) {
      await queryInterface.removeColumn('fee_plan_item', 'published_at');
    }
    if (desc.publish_status) {
      await queryInterface.removeColumn('fee_plan_item', 'publish_status');
    }
  },
};
