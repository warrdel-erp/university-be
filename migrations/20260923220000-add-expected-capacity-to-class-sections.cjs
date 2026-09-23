'use strict';

/** Add expected_capacity to class_sections (required, non-zero). */
module.exports = {
  async up(queryInterface, Sequelize) {
    const desc = await queryInterface.describeTable('class_sections');
    if (desc.expected_capacity) {
      return;
    }

    await queryInterface.addColumn('class_sections', 'expected_capacity', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Expected student capacity for this section (must be > 0)',
    });

    await queryInterface.sequelize.query(
      'UPDATE class_sections SET expected_capacity = 1 WHERE expected_capacity IS NULL',
    );

    await queryInterface.changeColumn('class_sections', 'expected_capacity', {
      type: Sequelize.INTEGER,
      allowNull: false,
      comment: 'Expected student capacity for this section (must be > 0)',
    });
  },

  async down(queryInterface) {
    const desc = await queryInterface.describeTable('class_sections');
    if (!desc.expected_capacity) {
      return;
    }
    await queryInterface.removeColumn('class_sections', 'expected_capacity');
  },
};
