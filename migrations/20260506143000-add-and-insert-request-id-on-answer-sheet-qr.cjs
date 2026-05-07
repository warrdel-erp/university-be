'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const tableName = 'answer_sheet_qr';
    const columnName = 'request_id';

    // Check whether request_id column already exists
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'
    `);

    // Add request_id column as nullable initially
    // Nullable is required because existing rows already exist
    if (!columns?.length) {
      await queryInterface.addColumn(tableName, columnName, {
        type: Sequelize.UUID,
        allowNull: true,
      });
    }

    // Generate one common UUID for all existing rows
    // This acts as a batch/group request id for old data
    const [uuidResult] = await sequelize.query(`
      SELECT UUID() as requestId
    `);

    const requestId = uuidResult[0].requestId;

    // Fill existing rows where request_id is missing
    // All old rows will share the same request_id
    await sequelize.query(`
      UPDATE ${tableName}
      SET ${columnName} = '${requestId}'
      WHERE ${columnName} IS NULL OR ${columnName} = ''
    `);

    // Make request_id mandatory for future records
    // Future QR generation should pass a common request_id
    // for all rows generated in the same request/batch
    await queryInterface.changeColumn(tableName, columnName, {
      type: Sequelize.UUID,
      allowNull: false,
    });

    /*
      NOTE:
      request_id is intentionally NOT UNIQUE.

      Multiple QR rows generated together will share the same request_id.

      Example:
      qr1 -> request_id = abc-uuid
      qr2 -> request_id = abc-uuid
      qr3 -> request_id = abc-uuid

      If a UNIQUE index were added here, migration could fail
      when duplicate request_id values exist because multiple rows
      are expected to share the same batch/group UUID.
    */
  },

  async down(queryInterface) {
    const sequelize = queryInterface.sequelize;
    const tableName = 'answer_sheet_qr';
    const columnName = 'request_id';

    // Check whether request_id column exists before removing
    const [columns] = await sequelize.query(`
      SHOW COLUMNS FROM ${tableName} LIKE '${columnName}'
    `);

    // Remove request_id column during rollback
    if (columns?.length) {
      await queryInterface.removeColumn(tableName, columnName);
    }
  },
};