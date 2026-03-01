'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE users 
      SET phone = NULL 
      WHERE phone = 'null';
    `);
  },

  async down(queryInterface, Sequelize) {

    await queryInterface.sequelize.query(`
      UPDATE users 
      SET phone = 'null' 
      WHERE phone IS NULL;
    `);

    await queryInterface.changeColumn('users', 'phone', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  }
};
