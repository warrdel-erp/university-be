'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('question_paper');

    if (!tableInfo.parent_id) {
      // 1. Add column
      await queryInterface.addColumn('question_paper', 'parent_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });

      // 2. Add FK constraint
      await queryInterface.addConstraint('question_paper', {
        fields: ['parent_id'],
        type: 'foreign key',
        name: 'fk_qp_parent_id',
        references: {
          table: 'question_paper',
          field: 'id',
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });

      // 3. Add index
      await queryInterface.addIndex('question_paper', ['parent_id'], {
        name: 'idx_qp_parent_id',
      });
    }
  },

  async down(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('question_paper');
    if (tableInfo.parent_id) {
      await queryInterface.removeConstraint('question_paper', 'fk_qp_parent_id').catch(() => {});
      await queryInterface.removeIndex('question_paper', 'idx_qp_parent_id').catch(() => {});
      await queryInterface.removeColumn('question_paper', 'parent_id');
    }
  }
};
