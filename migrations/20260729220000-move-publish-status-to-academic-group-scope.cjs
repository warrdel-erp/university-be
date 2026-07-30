module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'academic_group_scope',
        'publish_status',
        {
          type: Sequelize.ENUM('draft', 'published'),
          allowNull: false,
          defaultValue: 'draft',
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        'UPDATE academic_group_scope ags JOIN academic_group ag ON ag.academic_group_scope_id = ags.academic_group_scope_id SET ags.publish_status = ag.publish_status;',
        { transaction }
      );

      await queryInterface.removeColumn('academic_group', 'publish_status', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.addColumn(
        'academic_group',
        'publish_status',
        {
          type: Sequelize.ENUM('draft', 'published'),
          allowNull: false,
          defaultValue: 'draft',
        },
        { transaction }
      );

      await queryInterface.sequelize.query(
        'UPDATE academic_group ag JOIN academic_group_scope ags ON ag.academic_group_scope_id = ags.academic_group_scope_id SET ag.publish_status = ags.publish_status;',
        { transaction }
      );

      await queryInterface.removeColumn('academic_group_scope', 'publish_status', { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
