const fs = require('fs');
let indexContent = fs.readFileSync('/Users/jitin/Main/warrdel/university/university-erp-be/models/index.js', 'utf8');

const regexBelongsTo = /(\w+)\.belongsTo\(employeeModel,\s*\{\s*foreignKey:\s*"employeeId"(?:,\s*targetKey:\s*"userId")?,\s*as:\s*"([^"]+)"\s*\}\);/g;
const regexHasMany = /employeeModel\.hasMany\((\w+),\s*\{\s*foreignKey:\s*"employeeId"(?:,\s*sourceKey:\s*"userId")?,\s*as:\s*"([^"]+)"\s*\}\);/g;

indexContent = indexContent.replace(regexBelongsTo, (match, p1, p2) => {
    return `${p1}.belongsTo(employeeModel, { foreignKey: "employeeId", targetKey: "userId", as: "${p2}" });`;
});

indexContent = indexContent.replace(regexHasMany, (match, p1, p2) => {
    return `employeeModel.hasMany(${p1}, { foreignKey: "employeeId", sourceKey: "userId", as: "${p2}" });`;
});

// Also fix teacherId in examSetupModel
indexContent = indexContent.replace(/examSetupModel\.belongsTo\(employeeModel,\s*\{\s*foreignKey:\s*"teacherId"(?:,\s*targetKey:\s*"userId")?,\s*as:\s*"employee"\s*\}\);/, 
    'examSetupModel.belongsTo(employeeModel, { foreignKey: "teacherId", targetKey: "userId", as: "employee" });');

// Also fix substituteEmployeeId in teacherSubstituteModel
indexContent = indexContent.replace(/teacherSubstituteModel\.belongsTo\(employeeModel,\s*\{\s*foreignKey:\s*"substituteEmployeeId"(?:,\s*targetKey:\s*"userId")?,\s*as:\s*"substituteEmployee"\s*\}\);/,
    'teacherSubstituteModel.belongsTo(employeeModel, { foreignKey: "substituteEmployeeId", targetKey: "userId", as: "substituteEmployee" });');
indexContent = indexContent.replace(/employeeModel\.hasMany\(teacherSubstituteModel,\s*\{\s*foreignKey:\s*"substituteEmployeeId"(?:,\s*sourceKey:\s*"userId")?,\s*as:\s*"substituteAssignments"\s*\}\);/,
    'employeeModel.hasMany(teacherSubstituteModel, { foreignKey: "substituteEmployeeId", sourceKey: "userId", as: "substituteAssignments" });');


fs.writeFileSync('/Users/jitin/Main/warrdel/university/university-erp-be/models/index.js', indexContent);
console.log("Updated index.js");
