'use strict';

/**
 * Align transport_vehicle with model: employee_id → user_id
 */

const TABLE_NAME = 'transport_vehicle';

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const description = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(description[columnName]);
}

async function tableExists(queryInterface, tableName, transaction) {
  const tables = await queryInterface.showAllTables({ transaction });
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function dropFksOnColumn(queryInterface, tableName, columnName, transaction) {
  const [constraints] = await queryInterface.sequelize.query(
    `
    SELECT CONSTRAINT_NAME AS constraintName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `,
    { replacements: [tableName, columnName], transaction },
  );

  for (const row of constraints) {
    await queryInterface.sequelize.query(
      `ALTER TABLE \`${tableName}\` DROP FOREIGN KEY \`${row.constraintName}\``,
      { transaction },
    );
  }
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      if (!(await tableExists(queryInterface, TABLE_NAME, transaction))) {
        await transaction.commit();
        return;
      }

      const hasEmployeeId = await columnExists(queryInterface, TABLE_NAME, 'employee_id', transaction);
      const hasUserId = await columnExists(queryInterface, TABLE_NAME, 'user_id', transaction);

      if (!hasUserId) {
        await queryInterface.addColumn(
          TABLE_NAME,
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
        await dropFksOnColumn(queryInterface, TABLE_NAME, 'employee_id', transaction);

        await queryInterface.sequelize.query(
          `
          UPDATE \`${TABLE_NAME}\` AS t
          INNER JOIN employee AS e
            ON e.employee_id = t.employee_id
          SET t.user_id = e.user_id
          WHERE t.employee_id IS NOT NULL
            AND (t.user_id IS NULL)
          `,
          { transaction },
        );

        await queryInterface.removeColumn(TABLE_NAME, 'employee_id', { transaction });
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
      if (!(await tableExists(queryInterface, TABLE_NAME, transaction))) {
        await transaction.commit();
        return;
      }

      const hasUserId = await columnExists(queryInterface, TABLE_NAME, 'user_id', transaction);
      const hasEmployeeId = await columnExists(queryInterface, TABLE_NAME, 'employee_id', transaction);

      if (!hasEmployeeId) {
        await queryInterface.addColumn(
          TABLE_NAME,
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
        await dropFksOnColumn(queryInterface, TABLE_NAME, 'user_id', transaction);

        await queryInterface.sequelize.query(
          `
          UPDATE \`${TABLE_NAME}\` AS t
          INNER JOIN employee AS e
            ON e.user_id = t.user_id
          SET t.employee_id = e.employee_id
          WHERE t.user_id IS NOT NULL
            AND (t.employee_id IS NULL)
          `,
          { transaction },
        );

        await queryInterface.removeColumn(TABLE_NAME, 'user_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
