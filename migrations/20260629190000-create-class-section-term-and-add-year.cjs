'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const classSectionsTable = await queryInterface.describeTable('class_sections');
      if (!classSectionsTable.year) {
        await queryInterface.addColumn(
          'class_sections',
          'year',
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Program year level (1, 2, 3...)',
          },
          { transaction },
        );
      }

      const tables = await queryInterface.showAllTables({ transaction });
      if (!tables.includes('class_section_term')) {
        await queryInterface.createTable(
          'class_section_term',
          {
            class_section_term_id: {
              type: Sequelize.INTEGER,
              primaryKey: true,
              autoIncrement: true,
              allowNull: false,
            },
            class_sections_id: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'class_sections',
                key: 'class_sections_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'CASCADE',
            },
            term: {
              type: Sequelize.INTEGER,
              allowNull: false,
              comment: 'Program semester/term number (1..totalTerms from course)',
            },
            created_by: {
              type: Sequelize.INTEGER,
              allowNull: false,
              references: {
                model: 'users',
                key: 'user_id',
              },
              onUpdate: 'CASCADE',
              onDelete: 'RESTRICT',
            },
            created_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            deleted_at: {
              type: Sequelize.DATE,
              allowNull: true,
            },
          },
          { transaction },
        );

        await queryInterface.addIndex(
          'class_section_term',
          ['class_sections_id', 'term'],
          {
            unique: true,
            name: 'class_section_term_sections_id_term_unique',
            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('class_section_term', { transaction });

      const classSectionsTable = await queryInterface.describeTable('class_sections');
      if (classSectionsTable.year) {
        await queryInterface.removeColumn('class_sections', 'year', { transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
