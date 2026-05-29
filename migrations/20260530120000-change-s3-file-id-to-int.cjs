'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Add new auto-increment ID column to s3_files
      await queryInterface.sequelize.query(`
        ALTER TABLE s3_files ADD COLUMN new_id INT NOT NULL AUTO_INCREMENT UNIQUE
      `, { transaction });

      // 2. Add new integer foreign key column to answer_sheet_qr
      await queryInterface.sequelize.query(`
        ALTER TABLE answer_sheet_qr ADD COLUMN new_file_upload_id INT NULL
      `, { transaction });

      // 3. Migrate existing data mappings
      await queryInterface.sequelize.query(`
        UPDATE answer_sheet_qr a
        JOIN s3_files s ON a.file_upload_id = s.id
        SET a.new_file_upload_id = s.new_id
      `, { transaction });

      // 4. Drop the existing foreign key constraint from answer_sheet_qr
      const [results] = await queryInterface.sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'answer_sheet_qr'
          AND COLUMN_NAME = 'file_upload_id'
          AND REFERENCED_TABLE_NAME IS NOT NULL
      `, { transaction });

      if (results.length > 0) {
        for (const res of results) {
          await queryInterface.sequelize.query(`
            ALTER TABLE answer_sheet_qr DROP FOREIGN KEY \`${res.CONSTRAINT_NAME}\`
          `, { transaction });
        }
      }

      // 5. Drop old UUID columns
      await queryInterface.sequelize.query(`
        ALTER TABLE s3_files DROP COLUMN id
      `, { transaction });
      
      await queryInterface.sequelize.query(`
        ALTER TABLE answer_sheet_qr DROP COLUMN file_upload_id
      `, { transaction });

      // 6. Rename new columns to original names
      await queryInterface.sequelize.query(`
        ALTER TABLE s3_files RENAME COLUMN new_id TO id
      `, { transaction });

      await queryInterface.sequelize.query(`
        ALTER TABLE answer_sheet_qr RENAME COLUMN new_file_upload_id TO file_upload_id
      `, { transaction });

      // 7. Make the new INT auto_increment column the primary key
      // Dropping the unique index and adding primary key.
      await queryInterface.sequelize.query(`
        ALTER TABLE s3_files DROP INDEX new_id, ADD PRIMARY KEY (id)
      `, { transaction });

      // 8. Re-add foreign key constraint with the new integer columns
      await queryInterface.sequelize.query(`
        ALTER TABLE answer_sheet_qr 
        ADD CONSTRAINT fk_answer_sheet_qr_file_upload_id 
        FOREIGN KEY (file_upload_id) REFERENCES s3_files(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
      `, { transaction });

      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface, Sequelize) {
    // Reverting this complex migration involves doing the exact opposite.
    // Given the complexity of UUID generation in SQL, down migration would 
    // require generating new UUIDs for s3_files and mapping them back.
    throw new Error('Down migration for UUID to INT conversion is not supported.');
  }
};
