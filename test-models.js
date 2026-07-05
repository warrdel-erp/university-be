import fs from 'fs';
const models = fs.readdirSync('./models').filter(f => f.includes('scope') || f.includes('permission') || f.includes('role'));
console.log(models);
