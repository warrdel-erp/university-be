'use strict';

/**
 * lecture_window: replace employee_id with user_id (teacher key).
 * Backfills user_id from employee.user_id before dropping employee_id.
 */

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const description = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(description[columnName]);
}

async function dropEmployeeFk(queryInterface, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'lecture_window'
      AND COLUMN_NAME = 'employee_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE lecture_window DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const hasEmployeeId = await columnExists(
        queryInterface,
        'lecture_window',
        'employee_id',
        transaction,
      );
      const hasUserId = await columnExists(
        queryInterface,
        'lecture_window',
        'user_id',
        transaction,
      );

      if (!hasUserId) {
        await queryInterface.addColumn(
          'lecture_window',
          'user_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'user_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (hasEmployeeId) {
        await dropEmployeeFk(queryInterface, transaction);

        await queryInterface.sequelize.query(
          `
          UPDATE lecture_window AS lw
          INNER JOIN employee AS e
            ON e.employee_id = lw.employee_id
          SET lw.user_id = e.user_id
          WHERE lw.employee_id IS NOT NULL
          `,
          { transaction },
        );

        await queryInterface.removeColumn('lecture_window', 'employee_id', { transaction });
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
      const hasUserId = await columnExists(
        queryInterface,
        'lecture_window',
        'user_id',
        transaction,
      );
      const hasEmployeeId = await columnExists(
        queryInterface,
        'lecture_window',
        'employee_id',
        transaction,
      );

      if (!hasEmployeeId) {
        await queryInterface.addColumn(
          'lecture_window',
          'employee_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'employee',
              key: 'employee_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (hasUserId) {
        await queryInterface.sequelize.query(
          `
          UPDATE lecture_window AS lw
          INNER JOIN employee AS e
            ON e.user_id = lw.user_id
          SET lw.employee_id = e.employee_id
          WHERE lw.user_id IS NOT NULL
          `,
          { transaction },
        );

        const [userFks] = await queryInterface.sequelize.query(
          `
          SELECT CONSTRAINT_NAME AS constraintName
          FROM information_schema.KEY_COLUMN_USAGE
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'lecture_window'
            AND COLUMN_NAME = 'user_id'
            AND REFERENCED_TABLE_NAME IS NOT NULL
          `,
          { transaction },
        );

        for (const row of userFks) {
          await queryInterface.sequelize.query(
            `ALTER TABLE lecture_window DROP FOREIGN KEY \`${row.constraintName}\``,
            { transaction },
          );
        }

        await queryInterface.removeColumn('lecture_window', 'user_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
