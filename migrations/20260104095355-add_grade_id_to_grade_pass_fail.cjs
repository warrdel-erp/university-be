'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('grade_pass_fail', 'grade_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'grade',
        key: 'grade_id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('grade_pass_fail', 'grade_id');
  }
};