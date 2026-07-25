'use strict';

/**
 * faculity_load.current_load: DECIMAL(10,2) → INTEGER hours
 * Still from week-template load distribution: ROUND(SUM(period_length minutes) / 60).
 * defined_load stays INTEGER.
 */

const TABLE = 'faculity_load';

async function tableExists(queryInterface, tableName, transaction) {
  const tables = await queryInterface.showAllTables({ transaction });
  const normalized = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name || String(t)));
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const description = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(description[columnName]);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      if (!(await tableExists(queryInterface, TABLE, transaction))) {
        return;
      }
      if (!(await columnExists(queryInterface, TABLE, 'current_load', transaction))) {
        return;
      }

      await queryInterface.changeColumn(
        TABLE,
        'current_load',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE \`${TABLE}\` fl
        INNER JOIN employee e
          ON e.employee_id = fl.employee_id
         AND e.deleted_at IS NULL
        SET fl.current_load = (
          SELECT ROUND(COALESCE(SUM(s.period_length), 0) / 60)
          FROM time_table_cell_teachers t
          INNER JOIN time_table_cell c
            ON c.time_table_cell_id = t.time_table_cell_id
          INNER JOIN time_table_structure_periods p
            ON p.time_table_creation_id = c.time_table_creation_id
          INNER JOIN time_table_structure s
            ON s.time_table_name_id = p.time_table_name_id
          WHERE t.user_id = e.user_id
        )
        WHERE fl.deleted_at IS NULL
        `,
        { transaction },
      );
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      if (!(await tableExists(queryInterface, TABLE, transaction))) {
        return;
      }
      if (!(await columnExists(queryInterface, TABLE, 'current_load', transaction))) {
        return;
      }

      await queryInterface.changeColumn(
        TABLE,
        'current_load',
        {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0,
        },
        { transaction },
      );

      await queryInterface.sequelize.query(
        `
        UPDATE \`${TABLE}\` fl
        INNER JOIN employee e
          ON e.employee_id = fl.employee_id
         AND e.deleted_at IS NULL
        SET fl.current_load = (
          SELECT ROUND(COALESCE(SUM(s.period_length), 0) / 60, 2)
          FROM time_table_cell_teachers t
          INNER JOIN time_table_cell c
            ON c.time_table_cell_id = t.time_table_cell_id
          INNER JOIN time_table_structure_periods p
            ON p.time_table_creation_id = c.time_table_creation_id
          INNER JOIN time_table_structure s
            ON s.time_table_name_id = p.time_table_name_id
          WHERE t.user_id = e.user_id
        )
        WHERE fl.deleted_at IS NULL
        `,
        { transaction },
      );
    });
  },
};
