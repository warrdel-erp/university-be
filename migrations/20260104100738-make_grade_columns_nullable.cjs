"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.changeColumn("grade", "grading_type", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "marks_system", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "gps_formula", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "grade_replacement_rule", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "max_attempts_allowed", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "max_grace_per_subjects", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "max_grace_per_semester", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "apply_grace", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "moderation_type", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.changeColumn("grade", "moderation_value", {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.changeColumn("grade", "grading_type", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "marks_system", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "gps_formula", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "grade_replacement_rule", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "max_attempts_allowed", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "max_grace_per_subjects", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "max_grace_per_semester", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "apply_grace", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "moderation_type", {
      type: Sequelize.STRING,
      allowNull: false
    });

    await queryInterface.changeColumn("grade", "moderation_value", {
      type: Sequelize.STRING,
      allowNull: false
    });
  }
};