'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const fpiDesc = await queryInterface.describeTable('fee_plan_item');
    if (!fpiDesc.term) {
      await queryInterface.addColumn('fee_plan_item', 'term', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Programme term / semester (1, 2, 3...)',
      });
    }

    const fpphDesc = await queryInterface.describeTable('fee_plan_publish_history');
    if (!fpphDesc.term) {
      await queryInterface.addColumn('fee_plan_publish_history', 'term', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Programme term / semester (1, 2, 3...)',
      });
    }
  },

  async down(queryInterface) {
    const fpiDesc = await queryInterface.describeTable('fee_plan_item');
    if (fpiDesc.term) {
      await queryInterface.removeColumn('fee_plan_item', 'term');
    }

    const fpphDesc = await queryInterface.describeTable('fee_plan_publish_history');
    if (fpphDesc.term) {
      await queryInterface.removeColumn('fee_plan_publish_history', 'term');
    }
  },
};
