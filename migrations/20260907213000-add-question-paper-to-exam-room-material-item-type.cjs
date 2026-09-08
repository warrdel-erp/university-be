"use strict";

/**
 * Align exam_room_material_item.item_type ENUM with model/API.
 * DB was created without QUESTION_PAPER; /auto inserts it → "Data truncated for column 'item_type'".
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        ALTER TABLE \`exam_room_material_item\`
        MODIFY COLUMN \`item_type\` ENUM(
          'ANSWER_SHEET',
          'EXTRA_SHEET',
          'GRAPH_SHEET',
          'ROUGH_SHEET',
          'ATTENDANCE_SHEET',
          'ROOM_KIT',
          'QUESTION_PAPER'
        ) NOT NULL
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `
        UPDATE \`exam_room_material_item\`
        SET \`item_type\` = 'ROOM_KIT'
        WHERE \`item_type\` = 'QUESTION_PAPER'
        `,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE \`exam_room_material_item\`
        MODIFY COLUMN \`item_type\` ENUM(
          'ANSWER_SHEET',
          'EXTRA_SHEET',
          'GRAPH_SHEET',
          'ROUGH_SHEET',
          'ATTENDANCE_SHEET',
          'ROOM_KIT'
        ) NOT NULL
        `,
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
