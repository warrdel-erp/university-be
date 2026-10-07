"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("student_fee_invoice", "base_amount", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    });
    await queryInterface.addColumn("student_fee_invoice", "discount_amount", {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("student_fee_invoice", "base_amount");
    await queryInterface.removeColumn("student_fee_invoice", "discount_amount");
  },
};
