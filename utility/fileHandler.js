import csv from 'csv-parser';
import fs from 'fs';
import xlsx from 'xlsx';

export const readCSV = (file) => {
    return new Promise((resolve, reject) => {
      const results = [];
      const filePath = file.tempFilePath || file.student.data;
      if (!fs.existsSync(filePath)) {
        return reject(new Error('CSV file not found'));
      }
  
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(new Error('Error reading CSV file: ' + error.message)));
    });
};

export const readExcel = (file, daata) => {
  return new Promise((resolve, reject) => {
    try {
      // Reading the Excel file
      const workbook = xlsx.read(file.student.data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json(worksheet);

      // Add daata values directly to each record
      const updatedData = data.map(item => ({
        ...item,
        ...daata 
      }));
      resolve(updatedData);
    } catch (error) {
      reject(error);
    }
  });
};