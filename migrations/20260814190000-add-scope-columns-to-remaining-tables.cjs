'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (!desc[column]) {
          await queryInterface.addColumn(table, column, {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: referenceModel ? {
              model: referenceModel,
              key: referenceKey
            } : undefined
          });
        }
      } catch (err) {
        // Table might not exist yet, skip safely
      }
    };

    // Add missing campus_id columns to remaining tables
    await addColumnIfNotExists('asset', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('amc_vendors', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('amc_contracts', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('service_tickets', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('asset_issues', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('notice', 'campus_id', 'campus', 'campus_id');

    // BACKFILL QUERIES FROM INSTITUTE

    await queryInterface.sequelize.query(`
      UPDATE asset a
      JOIN institute i ON a.institute_id = i.institute_id
      SET a.campus_id = i.campus_id
      WHERE a.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      UPDATE notice n
      JOIN institute i ON n.institute_id = i.institute_id
      SET n.campus_id = i.campus_id
      WHERE n.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (desc[column]) {
          await queryInterface.removeColumn(table, column);
        }
      } catch (err) {}
    };

    await removeColumnIfExists('asset', 'campus_id');
    await removeColumnIfExists('amc_vendors', 'campus_id');
    await removeColumnIfExists('amc_contracts', 'campus_id');
    await removeColumnIfExists('service_tickets', 'campus_id');
    await removeColumnIfExists('asset_issues', 'campus_id');
    await removeColumnIfExists('notice', 'campus_id');
  }
};
