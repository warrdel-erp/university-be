'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const tableName = 'answer_sheet_qr';
    const columnName = 'request_id';
    const uniqueIndexName = 'uq_answer_sheet_qr_request_id';

    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'
    `);

    if (!columns?.length) {
      await queryInterface.addColumn(tableName, columnName, {
        type: Sequelize.UUID,
        allowNull: true,
        after: 'qr',
      });
    }

    // Ensure every existing row has a request id.
    await sequelize.query(`
      UPDATE ${tableName}
      SET ${columnName} = UUID()
      WHERE ${columnName} IS NULL OR ${columnName} = ''
    `);

    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM ${tableName} WHERE Key_name = '${uniqueIndexName}'
    `);

    if (!indexes?.length) {
      await queryInterface.addIndex(tableName, [columnName], {
        name: uniqueIndexName,
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const tableName = 'answer_sheet_qr';
    const columnName = 'request_id';
    const uniqueIndexName = 'uq_answer_sheet_qr_request_id';

    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM ${tableName} WHERE Key_name = '${uniqueIndexName}'
    `);
    if (indexes?.length) {
      await queryInterface.removeIndex(tableName, uniqueIndexName);
    }

    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'
    `);
    if (columns?.length) {
      await queryInterface.removeColumn(tableName, columnName);
    }
  },
};
