'use strict';

/** Remove soft-delete from time_table_structure_periods (drop deleted_at / paranoid). */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Drop schedule cells that still point at soft-deleted periods
      await queryInterface.sequelize.query(
        `
        DELETE csi
        FROM class_schedule_item AS csi
        INNER JOIN time_table_structure_periods AS p
          ON p.time_table_creation_id = csi.time_table_creation_id
        WHERE p.deleted_at IS NOT NULL
        `,
        { transaction },
      );

      await queryInterface.bulkDelete(
        'time_table_structure_periods',
        {
          deleted_at: {
            [Sequelize.Op.ne]: null,
          },
        },
        { transaction },
      );

      await queryInterface.removeColumn(
        'time_table_structure_periods',
        'deleted_at',
        { transaction },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn('time_table_structure_periods', 'deleted_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },
};
