import * as model from '../models/index.js'

export async function employeeMetaData(data,transaction) {    
    try {
        const result = await model.employeeMetaDataModel.bulkCreate(data,{transaction});
        return result;
    } catch (error) {
        console.error("Error in adding meta data employee:", error);
        throw error;
    }
};

export async function deleteEmployeeMetaData (employeeId) {
    try {
        const result = await model.emplopeeRoleModel.destroy({
            where: { employeeId },
            individualHooks: true
        });
        return { message: 'employee meta data deleted successfully' };
    } catch (error) {
        console.error('Error during soft delete:', error);
        throw new Error('Unable to soft delete account');
    }
};

export async function updateEmployeeMetaData(entries, transaction) {

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {

    for (const entry of entries) {

      //  Validate required fields
      if (!entry.employeeId || !entry.types || !entry.codes) {
        console.warn(" Skipping invalid entry →", entry);
        skipped++;
        continue;
      }

      try {
        // First try update
        const [affectedCount] = await model.employeeMetaDataModel.update(
          {
            types: entry.types,
            created_by: entry.createdBy,
            updated_by: entry.updatedBy || null,
          },
          {
            where: {
              employee_id: entry.employeeId,
              codes: entry.codes,
            },
            transaction,
          }
        );

        if (affectedCount > 0) {
          updated++;
          console.log(
            ` Updated entry → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`
          );
        } else {
          // No existing row → insert new
          await model.employeeMetaDataModel.create(
            {
              employeeId: entry.employeeId,
              types: entry.types,
              codes: entry.codes,
              createdBy: entry.createdBy,
              updatedBy: entry.updatedBy 
            },
            { transaction }
          );
          inserted++;
          console.log(
            ` Inserted new entry → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`
          );
        }
      } catch (innerError) {
        console.error(
          `Error processing entry → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`,
          innerError
        );
        throw innerError; 
      }
    }

    //  Final summary
    console.log(
      ` Summary: ${inserted} inserted, ${updated} updated, ${skipped} skipped`
    );
    console.log(" All employee meta data entries processed successfully.");

    return true;
  } catch (error) {
    console.error(" Error replacing employee meta data entries:", error);
    throw error;
  }
}
