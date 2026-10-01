'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));
    if (!names.includes('fee_plan_publish_history')) {
      await queryInterface.createTable(
        'fee_plan_publish_history',
        {
          fee_plan_publish_history_id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          batch_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'batch', key: 'batch_id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          year: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          action: {
            type: Sequelize.ENUM('publish', 'unpublish'),
            allowNull: false,
          },
          published_at: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          published_by: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          university_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          institute_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'institute', key: 'institute_id' },
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
        },
        { charset: 'latin1', collate: 'latin1_swedish_ci' },
      );

      await queryInterface.addIndex('fee_plan_publish_history', ['batch_id', 'year'], {
        name: 'idx_fee_plan_publish_history_batch_year',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));
    if (names.includes('fee_plan_publish_history')) {
      await queryInterface.dropTable('fee_plan_publish_history');
    }
  },
};
