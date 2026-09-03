import * as models from '../models/index.js';

async function findData() {
  try {
    const userId = 56;
    
    // Find a date-wise cell that has attendance records
    const attendanceRecords = await models.attendanceRecordModel.findAll({
      limit: 10,
      attributes: ['timeTableCellDateWiseId'],
      group: ['timeTableCellDateWiseId'],
      raw: true
    });
    
    if (attendanceRecords.length === 0) {
      console.log("No attendance records found at all!");
      process.exit(0);
    }
    
    // We need to verify if these belong to the teacher userId=56.
    // The relationship is time_table_cell_date_wise -> time_table_cell -> facultyId
    let sourceId = null;
    let targetId = null;
    
    for (const record of attendanceRecords) {
      const cellDateWise = await models.timeTableCellDateWiseModel.findOne({
        where: { timeTableCellDateWiseId: record.timeTableCellDateWiseId },
        include: [{
          model: models.timeTableCellModel,
          as: 'timeTableCell',
          where: { facultyId: userId }
        }],
        raw: true,
        nest: true
      });
      
      if (cellDateWise) {
        sourceId = cellDateWise.timeTableCellDateWiseId;
        break;
      }
    }
    
    if (!sourceId) {
      console.log("Could not find an attendance record for userId 56. Taking any record to test...");
      sourceId = attendanceRecords[0].timeTableCellDateWiseId;
    }
    
    // Find another cell to copy to
    const targetCell = await models.timeTableCellDateWiseModel.findOne({
      where: { 
        timeTableCellDateWiseId: { [models.Sequelize.Op.ne]: sourceId }
      },
      include: [{
        model: models.timeTableCellModel,
        as: 'timeTableCell',
        where: { facultyId: userId }
      }],
      raw: true
    });
    
    targetId = targetCell ? targetCell.timeTableCellDateWiseId : (sourceId + 1);
    
    console.log(JSON.stringify({ sourceId, targetId }));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

findData();
