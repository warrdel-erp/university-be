'use strict';

/** Add subject snapshot columns on time_table_cell_date_wise (teachers stay in time_table_cell_teachers_date_wise). */
async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((t) => {
    const name = typeof t === 'string' ? t : t.tableName || t.name || Object.values(t)[0];
    return String(name).toLowerCase() === tableName.toLowerCase();
  });
}

async function columnExists(queryInterface, tableName, columnName) {
  const description = await queryInterface.describeTable(tableName);
  return Object.prototype.hasOwnProperty.call(description, columnName);
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!(await columnExists(queryInterface, 'time_table_cell_date_wise', 'subject_id'))) {
        await queryInterface.addColumn(
          'time_table_cell_date_wise',
          'subject_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'subject', key: 'subject_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (!(await columnExists(queryInterface, 'time_table_cell_date_wise', 'elective_subject_id'))) {
        await queryInterface.addColumn(
          'time_table_cell_date_wise',
          'elective_subject_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'elective_subject', key: 'elective_subject_id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      await queryInterface.sequelize.query(
        `
        UPDATE time_table_cell_date_wise AS dw
        INNER JOIN time_table_cell AS c
          ON c.time_table_cell_id = dw.time_table_cell_id
        SET
          dw.subject_id = c.subject_id,
          dw.elective_subject_id = c.elective_subject_id,
          dw.class_room_section_id = COALESCE(dw.class_room_section_id, c.class_room_section_id)
        `,
        { transaction },
      );

      if (await columnExists(queryInterface, 'time_table_cell_date_wise', 'user_id')) {
        await queryInterface.removeColumn('time_table_cell_date_wise', 'user_id', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, 'time_table_cell_date_wise'))) {
      return;
    }

    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (await columnExists(queryInterface, 'time_table_cell_date_wise', 'elective_subject_id')) {
        await queryInterface.removeColumn('time_table_cell_date_wise', 'elective_subject_id', { transaction });
      }
      if (await columnExists(queryInterface, 'time_table_cell_date_wise', 'subject_id')) {
        await queryInterface.removeColumn('time_table_cell_date_wise', 'subject_id', { transaction });
      }
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
