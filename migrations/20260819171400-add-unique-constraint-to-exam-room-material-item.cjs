"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex("exam_room_material_item", {
      fields: ["exam_room_material_bundle_id", "item_type"],
      unique: true,
      name: "uq_exam_room_material_item_bundle_item_type"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "exam_room_material_item",
      "uq_exam_room_material_item_bundle_item_type"
    );
  }
};
