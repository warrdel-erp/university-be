'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_item');

    if (!desc.name) {
      await queryInterface.addColumn('fee_plan_item', 'name', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Planned fee receipt label',
      });
    }

    if (!desc.academic_period) {
      await queryInterface.addColumn('fee_plan_item', 'academic_period', {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Academic period tag (e.g. Semester I)',
      });
    }

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

    if (!desc.created_at) {
      await queryInterface.addColumn('fee_plan_item', 'created_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }

    if (!desc.updated_at) {
      await queryInterface.addColumn('fee_plan_item', 'updated_at', {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      });
    }

    if (desc.fee_plan_profile_id) {
      await queryInterface.removeColumn('fee_plan_item', 'fee_plan_profile_id');
    }
  },

  async down(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('fee_plan_item');

    if (!desc.fee_plan_profile_id) {
      await queryInterface.addColumn('fee_plan_item', 'fee_plan_profile_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }
    if (desc.updated_at) {
      await queryInterface.removeColumn('fee_plan_item', 'updated_at');
    }
    if (desc.created_at) {
      await queryInterface.removeColumn('fee_plan_item', 'created_at');
    }
    if (desc.published_by) {
      await queryInterface.removeColumn('fee_plan_item', 'published_by');
    }
    if (desc.published_at) {
      await queryInterface.removeColumn('fee_plan_item', 'published_at');
    }
    if (desc.publish_status) {
      await queryInterface.removeColumn('fee_plan_item', 'publish_status');
    }
    if (desc.academic_period) {
      await queryInterface.removeColumn('fee_plan_item', 'academic_period');
    }
    if (desc.name) {
      await queryInterface.removeColumn('fee_plan_item', 'name');
    }
  },
};
