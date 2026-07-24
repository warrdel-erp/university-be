'use strict';

async function columnExists(queryInterface, tableName, columnName, transaction) {
  const table = await queryInterface.describeTable(tableName, transaction ? { transaction } : undefined);
  return Boolean(table[columnName]);
}

async function tableExists(queryInterface, tableName, transaction) {
  const tables = await queryInterface.showAllTables({ transaction });
  const normalized = tables.map((t) =>
    typeof t === 'string' ? t : t.tableName || t.name || String(t),
  );
  return normalized.some((name) => name.toLowerCase() === tableName.toLowerCase());
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      if (!(await columnExists(queryInterface, 'department', 'parent_department_id', transaction))) {
        await queryInterface.addColumn(
          'department',
          'parent_department_id',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'department',
              key: 'department_id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          { transaction },
        );
      }

      if (await tableExists(queryInterface, 'department_structure', transaction)) {
        await queryInterface.sequelize.query(
          `UPDATE department d
           INNER JOIN department_structure ds ON ds.department_id = d.department_id
           SET d.parent_department_id = ds.parent_department_id
           WHERE d.parent_department_id IS NULL`,
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
    if (await columnExists(queryInterface, 'department', 'parent_department_id')) {
      await queryInterface.removeColumn('department', 'parent_department_id');
    }
  },
};
