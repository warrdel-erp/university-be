import * as fileHandler from '../utility/fileHandler.js';
import * as resultStudentsService from '../services/resultStudentsService.js';

export const addResultStudent = async (req, res) => {

    const fileData = fileHandler.readExcelFile(req.files.students.data)

    const final = resultStudentsService.addResultStudent(fileData);

    res.json(final)
}

export const getStudentResult = async (req, res) => {
    try {
        const { rollNo, dob } = req.query;
        const result = await resultStudentsService.getStudentResult(rollNo, dob);
        if (result) {
            res.status(200).json({ success: true, result });
        } else {
            res.status(404).json({ success: false, message: "Student result not found" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}