import * as fileHandler from '../utility/fileHandler.js';
import * as resultStudentsService from '../services/resultStudentsService.js';

export const addResultStudent = async (req, res) => {

    const fileData = fileHandler.readExcelFile(req.files.students.data)

    const final = resultStudentsService.addResultStudent(fileData);


    res.json(final)
}