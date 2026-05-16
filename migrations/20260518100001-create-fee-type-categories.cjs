'use strict';

/**
 * Fee v2 — production migration order (fresh DB):
 *   20260518100001 … 20260518100007
 *   20260520130000-add-fee-plan-profile-id-to-students
 *   20260521100000-create-student-fee-payment
 * Skip 20260521120000–216000 (dev/staging repair only).
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fee_type_categories', {
      fee_type_category_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: { type: Sequelize.STRING, allowNull: false },
      description: { type: Sequelize.STRING, allowNull: true },
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
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fee_type_categories');
  },
};
