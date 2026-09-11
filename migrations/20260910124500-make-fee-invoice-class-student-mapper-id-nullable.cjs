"use strict";

/** Make fee_invoice__deprecated.class_student_mapper_id nullable (use student_id). */

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const [rows] = await queryInterface.sequelize.query(
    `
    SELECT 1 AS ok
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
    LIMIT 1
    `,
    {
      replacements: { tableName, columnName },
      transaction,
    },
  );
  return rows.length > 0;
}

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
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableName = (await tableExists(queryInterface, "fee_invoice__deprecated", transaction))
        ? "fee_invoice__deprecated"
        : "fee_invoice";

      if (
        await columnExists(
          queryInterface,
          tableName,
          "class_student_mapper_id",
          transaction,
        )
      ) {
        await queryInterface.changeColumn(
          tableName,
          "class_student_mapper_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const tableName = (await tableExists(queryInterface, "fee_invoice__deprecated", transaction))
        ? "fee_invoice__deprecated"
        : "fee_invoice";

      if (
        await columnExists(
          queryInterface,
          tableName,
          "class_student_mapper_id",
          transaction,
        )
      ) {
        await queryInterface.changeColumn(
          tableName,
          "class_student_mapper_id",
          {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
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
