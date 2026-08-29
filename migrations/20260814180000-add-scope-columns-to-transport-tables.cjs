'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (table, column, referenceModel, referenceKey) => {
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
    };

    // Add missing campus_id columns to transport tables
    await addColumnIfNotExists('transport_route', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('transport_vehicle', 'campus_id', 'campus', 'campus_id');
    await addColumnIfNotExists('assign_vehicle', 'campus_id', 'campus', 'campus_id');

    // BACKFILL QUERIES FROM INSTITUTE

    await queryInterface.sequelize.query(`
      UPDATE transport_route tr
      JOIN institute i ON tr.institute_id = i.institute_id
      SET tr.campus_id = i.campus_id
      WHERE tr.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      UPDATE transport_vehicle tv
      JOIN institute i ON tv.institute_id = i.institute_id
      SET tv.campus_id = i.campus_id
      WHERE tv.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `).catch(() => {});

    await queryInterface.sequelize.query(`
      UPDATE assign_vehicle av
      JOIN institute i ON av.institute_id = i.institute_id
      SET av.campus_id = i.campus_id
      WHERE av.campus_id IS NULL AND i.campus_id IS NOT NULL;
    `).catch(() => {});
  },

  async down(queryInterface, Sequelize) {
    const removeColumnIfExists = async (table, column) => {
      const desc = await queryInterface.describeTable(table);
      if (desc[column]) {
        await queryInterface.removeColumn(table, column);
      }
    };

    await removeColumnIfExists('transport_route', 'campus_id');
    await removeColumnIfExists('transport_vehicle', 'campus_id');
    await removeColumnIfExists('assign_vehicle', 'campus_id');
  }
};
