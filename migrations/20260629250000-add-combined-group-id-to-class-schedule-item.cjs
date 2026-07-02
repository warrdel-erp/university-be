'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('class_schedule_item');
    if (!table.combined_group_id) {
      await queryInterface.addColumn('class_schedule_item', 'combined_group_id', {
        type: Sequelize.STRING(36),
        allowNull: true,
      });
      await queryInterface.addIndex('class_schedule_item', ['combined_group_id'], {
        name: 'idx_class_schedule_item_combined_group_id',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('class_schedule_item');
    if (table.combined_group_id) {
      await queryInterface.removeIndex(
        'class_schedule_item',
        'idx_class_schedule_item_combined_group_id',
      );
      await queryInterface.removeColumn('class_schedule_item', 'combined_group_id');
    }
  },
};
