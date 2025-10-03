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
  console.log(`>>>>>>entries`,entries)
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  try {
    console.log(" Starting employee meta data update...");
    console.log("Using transaction:", transaction ? "Yes" : "No");

    for (const entry of entries) {
      console.log(">>>> Processing entry:", entry);

      //  Validate required fields before upsert
      if (!entry.employeeId || !entry.types || !entry.codes) {
        console.error(
          ` Skipping invalid entry: Missing required field(s)`,
          entry
        );
        skipped++;
        continue;
      }

      try {
        const [record, created] = await model.employeeMetaDataModel.upsert(
          {
            employee_id: entry.employeeId,
            types: entry.types,
            codes: entry.codes,
            createdBy: entry.createdBy ,
            updated_by: entry.updatedBy || null,
          },
          { transaction }
        );

        if (created) {
          inserted++;
          console.log(
            ` Inserted new entry → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`
          );
        } else {
          updated++;
          console.log(
            ` Updated entry → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`
          );
        }

        // Optional: log the actual DB row
        console.log("DB Row after upsert:", record?.toJSON?.() || record);

      } catch (innerError) {
        console.error(
          ` Failed upsert → employeeId=${entry.employeeId}, types=${entry.types}, codes=${entry.codes}`,
          innerError.message
        );
        throw innerError; 
      }
    }

    // ✅ Summary
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
