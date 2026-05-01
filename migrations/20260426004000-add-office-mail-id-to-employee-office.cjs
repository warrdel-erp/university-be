'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Some environments have strict SQL modes that reject legacy zero-date defaults
    // during ALTER TABLE on existing tables. Relax mode for this migration only.
    await queryInterface.sequelize.query(
      "SET @OLD_SQL_MODE = @@SESSION.sql_mode;"
    );
    await queryInterface.sequelize.query(
      "SET SESSION sql_mode = REPLACE(REPLACE(@@SESSION.sql_mode, 'NO_ZERO_DATE', ''), 'NO_ZERO_IN_DATE', '');"
    );

    try {
      await queryInterface.addColumn('employee_office', 'office_mail_id', {
        type: Sequelize.STRING,
        allowNull: true
      });
    } finally {
      await queryInterface.sequelize.query(
        "SET SESSION sql_mode = @OLD_SQL_MODE;"
      );
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('employee_office', 'office_mail_id');
  }
};
