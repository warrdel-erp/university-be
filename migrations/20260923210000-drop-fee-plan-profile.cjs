'use strict';

/** Drop fee_plan_profile linkage — fee plans are batch-direct via fee_plan_item.batch_id. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const itemDesc = await queryInterface.describeTable('fee_plan_item');
    if (itemDesc.fee_plan_profile_id) {
      await queryInterface.removeColumn('fee_plan_item', 'fee_plan_profile_id');
    }

    const studentDesc = await queryInterface.describeTable('students');
    if (studentDesc.fee_plan_profile_id) {
      await queryInterface.removeColumn('students', 'fee_plan_profile_id');
    }

    const tables = await queryInterface.showAllTables();
    const names = tables.map((t) => (typeof t === 'string' ? t : t.tableName || t.name));
    if (names.includes('fee_plan_profile')) {
      await queryInterface.dropTable('fee_plan_profile');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable('fee_plan_profile', {
      fee_plan_profile_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      university_id: { type: Sequelize.INTEGER, allowNull: true },
      plan_type: {
        type: Sequelize.ENUM('annual', 'semester', 'trimester'),
        allowNull: false,
      },
      category: { type: Sequelize.STRING, allowNull: false },
      name: { type: Sequelize.STRING, allowNull: false },
      course_session_id: { type: Sequelize.INTEGER, allowNull: false },
      institute_id: { type: Sequelize.INTEGER, allowNull: false },
      publish_status: {
        type: Sequelize.ENUM('draft', 'published'),
        allowNull: false,
        defaultValue: 'draft',
      },
      campus_id: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: true },
      updated_at: { type: Sequelize.DATE, allowNull: true },
    });

    await queryInterface.addColumn('fee_plan_item', 'fee_plan_profile_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'fee_plan_profile', key: 'fee_plan_profile_id' },
    });

    await queryInterface.addColumn('students', 'fee_plan_profile_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'fee_plan_profile', key: 'fee_plan_profile_id' },
    });
  },
};
