const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join('/Users/jitin/Main/warrdel/university/university-erp-be', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`NOT FOUND: ${fullPath}`);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  let original = content;
  for (const { from, to } of replacements) {
    content = content.split(`as: "${from}"`).join(`as: "${to}"`);
    content = content.split(`as: '${from}'`).join(`as: '${to}'`);
    
    // Also fix model: model.employeeModel -> model: model.users
    // Because we just changed the alias for external associations which now point to userModel.
    // In index.js, userModel is exported as `users` on the `model` object.
    content = content.split(`model: model.employeeModel, as: "${to}"`).join(`model: model.users, as: "${to}"`);
    content = content.split(`model: model.employeeModel, as: '${to}'`).join(`model: model.users, as: '${to}'`);
    // Some might have newlines or spacing. Let's do a simple regex for model replacement just for this specific alias
    const regex = new RegExp(`model:\\s*model\\.employeeModel(?:\\s*|\\s*,\\s*)as:\\s*["']${to}["']`, 'g');
    content = content.replace(regex, `model: model.users, as: "${to}"`);
  }
  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${fullPath}`);
  }
}

replaceInFile('repository/timeTablecreateRepository.js', [{from: 'employeeDetails', to: 'user'}]);
replaceInFile('repository/leaveRequestRepository.js', [{from: 'employeeRequest', to: 'user'}]);
replaceInFile('repository/examScheduleRepository.js', [{from: 'teacherEmployee', to: 'user'}]);
replaceInFile('repository/internalAssessmentRepository.js', [{from: 'employees', to: 'user'}]);
replaceInFile('repository/jobRepository.js', [{from: 'facultyJobs', to: 'user'}, {from: 'employeeDetails', to: 'user'}]);
replaceInFile('repository/userRepository.js', [{from: 'employeeDetails', to: 'user'}]);
replaceInFile('repository/jobSettingsRepository.js', [{from: 'facultyJobs', to: 'user'}]);
replaceInFile('repository/lessonRepository.js', [{from: 'employeeLesson', to: 'user'}, {from: 'employeeDetails', to: 'user'}]);
replaceInFile('repository/teacherSubstituteRepository.js', [{from: 'substituteEmployee', to: 'substituteUser'}]);
replaceInFile('repository/evalutionRepository.js', [{from: 'employeeEvalution', to: 'user'}]);
replaceInFile('repository/faculityLoadRepository.js', [{from: 'employeeFaculity', to: 'user'}]);
