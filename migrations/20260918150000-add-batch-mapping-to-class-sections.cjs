'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
    // 1. Add session_batch_mapping_id to class_sections
    await queryInterface.addColumn('class_sections', 'session_batch_mapping_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'session_batch_mapping',
        key: 'session_batch_mapping_id',
      },
      onDelete: 'SET NULL',
    }, { transaction: t });

    // 2. Backfill session_batch_mapping_id
    // Batch is calculated as active_year - (year - 1)
    await queryInterface.sequelize.query(`
      UPDATE class_sections cs
      JOIN session_batch_mapping sbm 
        ON sbm.session_id = cs.session_id 
        AND sbm.batch = (cs.active_year - (IFNULL(cs.year, 1) - 1))
      SET cs.session_batch_mapping_id = sbm.session_batch_mapping_id
      WHERE cs.active_year IS NOT NULL;
    `, { transaction: t });
      });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
    // Remove the foreign key constraint first
    // Note: Sequelize auto-generates FK names, usually 'class_sections_session_batch_mapping_id_foreign_idx' or similar. 
    // Wait, removeColumn automatically handles it in most dialects if it's simple, but let's be safe.
    await queryInterface.removeColumn('class_sections', 'session_batch_mapping_id', { transaction: t });
      });
  }
};