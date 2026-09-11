"use strict";

/**
 * Rename class_student_mapper → class_student_mapper_depricated
 */

async function tableExists(queryInterface, tableName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1 AS ok
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
    LIMIT 1
    `,
    {
      replacements: { tableName },
      transaction,
    },
  );
  return rows.length > 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const hasOld = await tableExists(
        queryInterface,
        "class_student_mapper",
        transaction,
      );
      const hasNew = await tableExists(
        queryInterface,
        "class_student_mapper_depricated",
        transaction,
      );

      if (hasOld && !hasNew) {
        await queryInterface.renameTable(
          "class_student_mapper",
          "class_student_mapper_depricated",
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const hasOld = await tableExists(
        queryInterface,
        "class_student_mapper",
        transaction,
      );
      const hasNew = await tableExists(
        queryInterface,
        "class_student_mapper_depricated",
        transaction,
      );

      if (hasNew && !hasOld) {
        await queryInterface.renameTable(
          "class_student_mapper_depricated",
          "class_student_mapper",
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
