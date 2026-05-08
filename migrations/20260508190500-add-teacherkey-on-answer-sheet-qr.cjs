'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [assignedToUserColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'assigned_to_user'
    `);

    if (!assignedToUserColumns?.length) {
      await queryInterface.addColumn('answer_sheet_qr', 'assigned_to_user', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'user_id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    const [evaluatedAtColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'evaluated_at'
    `);

    if (!evaluatedAtColumns?.length) {
      await queryInterface.addColumn('answer_sheet_qr', 'evaluated_at', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    const [obtainedMarksColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'obtained_marks'
    `);

    if (!obtainedMarksColumns?.length) {
      await queryInterface.addColumn('answer_sheet_qr', 'obtained_marks', {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true,
      });
    }

  },

  async down(queryInterface) {
    const [obtainedMarksColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'obtained_marks'
    `);

    if (obtainedMarksColumns?.length) {
      await queryInterface.removeColumn('answer_sheet_qr', 'obtained_marks');
    }

    const [evaluatedAtColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'evaluated_at'
    `);

    if (evaluatedAtColumns?.length) {
      await queryInterface.removeColumn('answer_sheet_qr', 'evaluated_at');
    }

    const [assignedToUserColumns] = await queryInterface.sequelize.query(`
      SHOW COLUMNS FROM answer_sheet_qr LIKE 'assigned_to_user'
    `);

    if (assignedToUserColumns?.length) {
      await queryInterface.removeColumn('answer_sheet_qr', 'assigned_to_user');
    }

  },
};
