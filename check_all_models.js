import fs from 'fs';
import * as model from './models/index.js';

const repoContent = fs.readFileSync('./repository/timeTablecreateRepository.js', 'utf8');
const regex = /model\.([a-zA-Z0-9_]+)/g;
let match;
const usedModels = new Set();
while ((match = regex.exec(repoContent)) !== null) {
  usedModels.add(match[1]);
}

for (const m of usedModels) {
  if (model[m] === undefined) {
    console.log(`UNDEFINED: ${m}`);
  }
}
console.log("Done checking all model references.");
