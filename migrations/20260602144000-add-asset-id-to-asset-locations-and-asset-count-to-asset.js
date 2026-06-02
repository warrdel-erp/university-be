"use strict";

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.removeColumn("asset_locations", "name");

  await queryInterface.addColumn("asset_locations", "asset_id", {
    type: Sequelize.INTEGER,
    allowNull: false,
    after: "asset_location_id",
    references: {
      model: "asset",
      key: "asset_id",
    },
  });

  await queryInterface.addColumn("asset_locations", "class_room_section_id", {
    type: Sequelize.INTEGER,
    allowNull: false,
    after: "asset_id",
    references: {
      model: "class_room_section",
      key: "class_room_section_id",
    },
  });

  await queryInterface.addColumn("asset_locations", "count", {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 0,
    after: "class_room_section_id",
  });
}

export async function down(queryInterface) {
  await queryInterface.removeColumn("asset_locations", "count");
  await queryInterface.removeColumn("asset_locations", "class_room_section_id");
  await queryInterface.removeColumn("asset_locations", "asset_id");
  await queryInterface.addColumn("asset_locations", "name", {
    type: Sequelize.STRING,
    allowNull: false,
    after: "asset_location_id",
  });
}
