'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('library_issue_book');

    if (!tableDefinition.due_date) {
      await queryInterface.addColumn('library_issue_book', 'due_date', {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    if (!tableDefinition.issued_by) {
      await queryInterface.addColumn('library_issue_book', 'issued_by', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(
      "UPDATE library_issue_book SET status = 'Issued' WHERE status IS NULL OR status = '' OR status = 'Issue'",
    );

    await queryInterface.changeColumn('library_issue_book', 'status', {
      type: Sequelize.ENUM('Issued', 'Returned', 'Renewed', 'Overdue'),
      allowNull: false,
      defaultValue: 'Issued',
    });
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable('library_issue_book');

    await queryInterface.changeColumn('library_issue_book', 'status', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Issue',
    });

    if (tableDefinition.issued_by) {
      await queryInterface.removeColumn('library_issue_book', 'issued_by');
    }

    if (tableDefinition.due_date) {
      await queryInterface.removeColumn('library_issue_book', 'due_date');
    }
  },
};
