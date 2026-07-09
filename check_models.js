import * as model from './models/index.js';

const modelsToCheck = [
  'timeTableStructureModel',
  'timeTableStructurePeriodsModel',
  'classScheduleModel',
  'users',
  'subjectModel',
  'classRoomModel'
];

for (const m of modelsToCheck) {
  console.log(`${m}: ${model[m] ? 'Defined' : 'UNDEFINED'}`);
}
