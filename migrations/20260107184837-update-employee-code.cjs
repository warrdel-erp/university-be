'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `
        UPDATE employee e
        JOIN (
            SELECT 
                emp.employee_id,
                c.campus_code AS c_code,
                i.institute_code AS i_code,
                ROW_NUMBER() OVER (ORDER BY emp.employee_id) AS seq
            FROM employee emp
            JOIN campus c ON emp.campus_id = c.campus_id
            JOIN institute i ON emp.institute_id = i.institute_id
        ) AS source 
        ON e.employee_id = source.employee_id
        SET e.employee_Code = CONCAT(
            source.c_code, '/', 
            source.i_code, '/', 
            DATE_FORMAT(CURDATE(), '%y'), '/', 
            (1000 + source.seq)
        );
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.sequelize.query(
        `
        UPDATE employee
        SET employee_Code = NULL;
        `,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};