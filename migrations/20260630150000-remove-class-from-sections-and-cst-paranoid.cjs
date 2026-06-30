'use strict';

const { Op } = require('sequelize');
const { removeColumnSafe } = require('./helpers/sqlModeHelpers.cjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await removeColumnSafe(queryInterface, 'class_sections', 'class', transaction);

      const cstTable = await queryInterface.describeTable('class_section_term', { transaction });

      if (cstTable.deleted_at) {
        await queryInterface.bulkDelete(
          'class_section_term',
          { deleted_at: { [Op.ne]: null } },
          { transaction },
        );
        await removeColumnSafe(queryInterface, 'class_section_term', 'deleted_at', transaction);
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
      const classSectionsTable = await queryInterface.describeTable('class_sections', { transaction });
      if (!classSectionsTable.class) {
        await queryInterface.addColumn(
          'class_sections',
          'class',
          {
            type: Sequelize.STRING,
            allowNull: true,
          },
          { transaction },
        );
      }

      const cstTable = await queryInterface.describeTable('class_section_term', { transaction });
      if (!cstTable.deleted_at) {
        await queryInterface.addColumn(
          'class_section_term',
          'deleted_at',
          {
            type: Sequelize.DATE,
            allowNull: true,
          },
          { transaction },
        );
      }

      try {
        await queryInterface.addIndex(
          'class_section_term',
          ['class_sections_id', 'term'],
          {
            unique: true,
            name: 'class_section_term_sections_id_term_unique',
            transaction,
          },
        );
      } catch (error) {
        const message = String(error?.message ?? '');
        if (!message.includes('Duplicate key name')) {
          throw error;
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
