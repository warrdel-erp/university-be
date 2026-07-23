'use strict';

/**
 * Remove soft-delete from timetable cell tables.
 * Purges soft-deleted rows, then drops deleted_at so destroy() is permanent.
 *
 * Tables:
 *   - time_table_cell
 *   - time_table_cell_teachers
 *   - time_table_cell_date_wise
 *   - time_table_cell_teachers_date_wise
 *
 * Structure / routine / periods / course mapper already use hard delete
 * (see migrations 20260713160000, 20260715180000, 20260715190000).
 */

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const description = await queryInterface.describeTable(tableName, { transaction });
  return Boolean(description[columnName]);
}

async function purgeSoftDeletedCellGraph(queryInterface, transaction) {
  await queryInterface.sequelize.query(
    `
    DELETE tdw
    FROM time_table_cell_teachers_date_wise AS tdw
    INNER JOIN time_table_cell_date_wise AS dw
      ON dw.time_table_cell_date_wise_id = tdw.time_table_cell_date_wise_id
    WHERE dw.deleted_at IS NOT NULL
    `,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `
    DELETE tdw
    FROM time_table_cell_teachers_date_wise AS tdw
    INNER JOIN time_table_cell_date_wise AS dw
      ON dw.time_table_cell_date_wise_id = tdw.time_table_cell_date_wise_id
    INNER JOIN time_table_cell AS c
      ON c.time_table_cell_id = dw.time_table_cell_id
    WHERE c.deleted_at IS NOT NULL
    `,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `
    DELETE dw
    FROM time_table_cell_date_wise AS dw
    INNER JOIN time_table_cell AS c
      ON c.time_table_cell_id = dw.time_table_cell_id
    WHERE c.deleted_at IS NOT NULL
    `,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `DELETE FROM time_table_cell_teachers_date_wise WHERE deleted_at IS NOT NULL`,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `DELETE FROM time_table_cell_date_wise WHERE deleted_at IS NOT NULL`,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `DELETE FROM time_table_cell_teachers WHERE deleted_at IS NOT NULL`,
    { transaction },
  );

  await queryInterface.sequelize.query(
    `DELETE FROM time_table_cell WHERE deleted_at IS NOT NULL`,
    { transaction },
  );
}

const CELL_TABLES = [
  'time_table_cell',
  'time_table_cell_teachers',
  'time_table_cell_date_wise',
  'time_table_cell_teachers_date_wise',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const hasDeletedAt = await columnExists(
        queryInterface,
        'time_table_cell',
        'deleted_at',
        transaction,
      );

      if (hasDeletedAt) {
        await purgeSoftDeletedCellGraph(queryInterface, transaction);
      }

      for (const tableName of CELL_TABLES) {
        const columnPresent = await columnExists(
          queryInterface,
          tableName,
          'deleted_at',
          transaction,
        );
        if (columnPresent) {
          await queryInterface.removeColumn(tableName, 'deleted_at', { transaction });
        }
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
      for (const tableName of CELL_TABLES) {
        const columnPresent = await columnExists(
          queryInterface,
          tableName,
          'deleted_at',
          transaction,
        );
        if (!columnPresent) {
          await queryInterface.addColumn(
            tableName,
            'deleted_at',
            {
              type: Sequelize.DATE,
              allowNull: true,
            },
            { transaction },
          );
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
