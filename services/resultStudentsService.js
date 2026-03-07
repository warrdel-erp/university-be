import { data } from '../const/resultStudents.js';
import { parseCustomDate } from '../utility/dateFormat.js';

export const addResultStudent = (data) => {
    return formateData(data)
}

export const getStudentResult = async (rollNo, dob) => {
    const student = data.find(item => item.rollNo === rollNo && item.dob === dob);
    return student;
}


const formateData = (fileData) => {
    const students = {}
    const studentsSubjectsMap = {};

    let currentRollNo = ""

    fileData.forEach(row => {
        if (row["ROLL NO"]) {
            students[row["ROLL NO"]] = {
                rollNo: row["ROLL NO"],
                name: row["NAME"],
                dob: parseCustomDate(row["DOB"])
            }

            console.log(row["DOB"])
            currentRollNo = row["ROLL NO"]
            delete row["ROLL NO"]
            delete row["NAME"]
            delete row["DOB"]

        }

        if (row['STATUS OF RESULT']) {
            const currentStudent = students[currentRollNo];

            students[currentRollNo] = {
                ...currentStudent,
                statusOfResult: row['STATUS OF RESULT'],
                totCrdErnd: row['TOT CRD ERND'],
                gTotEarnCredit: row['G TOT EARN CREDIT'],
                sgpa: row['SGPA'],
                resultGrade: row['Result Grade'],
            }

            delete row['STATUS OF RESULT']
            delete row['TOT CRD ERND']
            delete row['G TOT EARN CREDIT']
            delete row['SGPA']
            delete row['Result Grade']
        }

        if (studentsSubjectsMap[currentRollNo]) {
            studentsSubjectsMap[currentRollNo].push(row)
        } else {
            studentsSubjectsMap[currentRollNo] = [row]
        }

    });


    const finalData = []

    Object.values(students).forEach(student => {
        finalData.push({
            ...student,
            subjects: studentsSubjectsMap[student.rollNo]
        })
    })

    const date = new Date()

    date.toISOString()
    return finalData

}