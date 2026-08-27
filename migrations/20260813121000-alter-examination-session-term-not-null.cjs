"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log("Altering examination_session_term columns to NOT NULL...");

    await queryInterface.changeColumn("examination_session_term", "university_id", {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn("examination_session_term", "institute_id", {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    await queryInterface.changeColumn("examination_session_term", "acedmic_year_id", {
      type: Sequelize.INTEGER,
      allowNull: false
    });

    console.log("Altered successfully.");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("examination_session_term", "university_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.changeColumn("examination_session_term", "institute_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });

    await queryInterface.changeColumn("examination_session_term", "acedmic_year_id", {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  }
};
