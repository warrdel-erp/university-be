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

// export async function refreshEmployeeMetaData(employeeId, entries, transaction) {
//   try {
//     await model.employeeMetaDataModel.destroy({
//       where: { employeeId },
//       transaction
//     });

//     if (entries && entries.length > 0) {
//       return await model.employeeMetaDataModel.bulkCreate(entries, { transaction });
//     }

//     return [];
//   } catch (error) {
//     console.error("Error refreshing employee meta data:", error);
//     throw error;
//   }
// }

export async function updateEmployeeMetaData(employeeId, entries, transaction) {
  try {
    if (!entries || entries.length === 0) return [];

    const updatePromises = entries.map(async (entry) => {
      const [updatedCount] = await model.employeeMetaDataModel.update(
        { codes: entry.codes, updatedBy: entry.updatedBy },
        {
          where: {
            employeeId,
            types: entry.types
          },
          transaction
        }
      );

      if (updatedCount === 0) {
        await model.employeeMetaDataModel.create(
          { employeeId, types: entry.types, codes: entry.codes, updatedBy: entry.updatedBy },
          { transaction }
        );
      }
    });

    await Promise.all(updatePromises);
    return entries;
  } catch (error) {
    console.error("Error updating employee meta data:", error);
    throw error;
  }
};