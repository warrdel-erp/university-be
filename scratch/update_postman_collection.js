import fs from 'fs';
import path from 'path';

const filePath = 'c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/docs/postman/univ-v2-academic-group.postman_collection.json';

const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const examTypeFolder = {
  "name": "Exam Types",
  "item": [
    {
      "name": "1. POST /examType — Add Exam Type",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": JSON.stringify({
            "academicYearId": 60,
            "examName": "Mid Term Exam 2026",
            "assessmentCode": "MID_TERM",
            "assessmentCategory": "EXAMINATION",
            "assessmentSubCategory": "Mid Term",
            "description": "Mid Term Assessment for Academic Year 2026",
            "averagePassingMark": 40,
            "isAveragePassingMark": true
          }, null, 2)
        },
        "url": {
          "raw": "{{baseurl}}/examType",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "examType"
          ]
        },
        "description": "**POST /examType**\n\nCreates a new exam type record with assessment code, category, sub-category, and description."
      },
      "response": [
        {
          "name": "201 — Exam Type Created",
          "originalRequest": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": JSON.stringify({
                "academicYearId": 60,
                "examName": "Mid Term Exam 2026",
                "assessmentCode": "MID_TERM",
                "assessmentCategory": "EXAMINATION",
                "assessmentSubCategory": "Mid Term",
                "description": "Mid Term Assessment for Academic Year 2026",
                "averagePassingMark": 40,
                "isAveragePassingMark": true
              }, null, 2)
            },
            "url": {
              "raw": "{{baseurl}}/examType",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "examType"
              ]
            }
          },
          "status": "Created",
          "code": 201,
          "_postman_previewlanguage": "json",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": JSON.stringify({
            "message": "Data added successfully",
            "examType": {
              "examTypeId": 1,
              "academicYearId": 60,
              "instituteId": 12,
              "universityId": 4,
              "examName": "Mid Term Exam 2026",
              "assessmentCode": "MID_TERM",
              "assessmentCategory": "EXAMINATION",
              "assessmentSubCategory": "Mid Term",
              "description": "Mid Term Assessment for Academic Year 2026",
              "averagePassingMark": 40,
              "isAveragePassingMark": true,
              "createdBy": 10,
              "updatedBy": 10,
              "createdAt": "2026-07-31T12:00:00.000Z",
              "updatedAt": "2026-07-31T12:00:00.000Z"
            }
          }, null, 2)
        }
      ]
    },
    {
      "name": "2. GET /examType — Get All Exam Types",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseurl}}/examType?academicYearId=60",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "examType"
          ],
          "query": [
            {
              "key": "academicYearId",
              "value": "60"
            }
          ]
        },
        "description": "**GET /examType**\n\nReturns list of all exam types filtered by academicYearId."
      },
      "response": [
        {
          "name": "200 — Exam Types Fetched",
          "originalRequest": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseurl}}/examType?academicYearId=60",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "examType"
              ],
              "query": [
                {
                  "key": "academicYearId",
                  "value": "60"
                }
              ]
            }
          },
          "status": "OK",
          "code": 200,
          "_postman_previewlanguage": "json",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": JSON.stringify([
            {
              "examTypeId": 1,
              "academicYearId": 60,
              "instituteId": 12,
              "universityId": 4,
              "examName": "Mid Term Exam 2026",
              "assessmentCode": "MID_TERM",
              "assessmentCategory": "EXAMINATION",
              "assessmentSubCategory": "Mid Term",
              "description": "Mid Term Assessment for Academic Year 2026",
              "averagePassingMark": 40,
              "isAveragePassingMark": true,
              "createdBy": 10,
              "updatedBy": 10
            }
          ], null, 2)
        }
      ]
    },
    {
      "name": "3. GET /examType/single — Get Single Exam Type",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseurl}}/examType/single?examTypeId=1",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "examType",
            "single"
          ],
          "query": [
            {
              "key": "examTypeId",
              "value": "1"
            }
          ]
        },
        "description": "**GET /examType/single**\n\nReturns details of a single exam type by examTypeId."
      },
      "response": [
        {
          "name": "200 — Exam Type Fetched",
          "originalRequest": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseurl}}/examType/single?examTypeId=1",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "examType",
                "single"
              ],
              "query": [
                {
                  "key": "examTypeId",
                  "value": "1"
                }
              ]
            }
          },
          "status": "OK",
          "code": 200,
          "_postman_previewlanguage": "json",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": JSON.stringify({
            "examTypeId": 1,
            "academicYearId": 60,
            "instituteId": 12,
            "universityId": 4,
            "examName": "Mid Term Exam 2026",
            "assessmentCode": "MID_TERM",
            "assessmentCategory": "EXAMINATION",
            "assessmentSubCategory": "Mid Term",
            "description": "Mid Term Assessment for Academic Year 2026",
            "averagePassingMark": 40,
            "isAveragePassingMark": true
          }, null, 2)
        }
      ]
    },
    {
      "name": "4. PATCH /examType — Update Exam Type",
      "request": {
        "method": "PATCH",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": JSON.stringify({
            "examTypeId": 1,
            "examName": "Mid Term Exam 2026 Updated",
            "assessmentCode": "MID_TERM_UPDATED",
            "assessmentCategory": "EXAMINATION",
            "assessmentSubCategory": "Mid Term",
            "description": "Updated Mid Term Assessment Description",
            "averagePassingMark": 45,
            "isAveragePassingMark": true
          }, null, 2)
        },
        "url": {
          "raw": "{{baseurl}}/examType",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "examType"
          ]
        },
        "description": "**PATCH /examType**\n\nUpdates an existing exam type record by examTypeId."
      },
      "response": [
        {
          "name": "200 — Exam Type Updated",
          "originalRequest": {
            "method": "PATCH",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": JSON.stringify({
                "examTypeId": 1,
                "examName": "Mid Term Exam 2026 Updated",
                "assessmentCode": "MID_TERM_UPDATED",
                "assessmentCategory": "EXAMINATION",
                "assessmentSubCategory": "Mid Term",
                "description": "Updated Mid Term Assessment Description",
                "averagePassingMark": 45,
                "isAveragePassingMark": true
              }, null, 2)
            },
            "url": {
              "raw": "{{baseurl}}/examType",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "examType"
              ]
            }
          },
          "status": "OK",
          "code": 200,
          "_postman_previewlanguage": "json",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": JSON.stringify({
            "message": "examDetails update succesfully",
            "examDetails": [1]
          }, null, 2)
        }
      ]
    },
    {
      "name": "5. DELETE /examType — Delete Exam Type",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": {
          "raw": "{{baseurl}}/examType?examTypeId=1",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "examType"
          ],
          "query": [
            {
              "key": "examTypeId",
              "value": "1"
            }
          ]
        },
        "description": "**DELETE /examType**\n\nDeletes an exam type by examTypeId."
      },
      "response": [
        {
          "name": "200 — Exam Type Deleted",
          "originalRequest": {
            "method": "DELETE",
            "header": [],
            "url": {
              "raw": "{{baseurl}}/examType?examTypeId=1",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "examType"
              ],
              "query": [
                {
                  "key": "examTypeId",
                  "value": "1"
                }
              ]
            }
          },
          "status": "OK",
          "code": 200,
          "_postman_previewlanguage": "json",
          "header": [
            {
              "key": "Content-Type",
              "value": "application/json"
            }
          ],
          "body": JSON.stringify({
            "message": "Delete successful for examDetails ID 1"
          }, null, 2)
        }
      ]
    }
  ]
};

// Check if folder already exists and replace, or append
const existingIdx = content.item.findIndex(i => i.name === 'Exam Types');
if (existingIdx >= 0) {
  content.item[existingIdx] = examTypeFolder;
} else {
  content.item.push(examTypeFolder);
}

// Add examTypeId to collection variables if not present
if (!content.variable.find(v => v.key === 'examTypeId')) {
  content.variable.push({
    "key": "examTypeId",
    "value": "1"
  });
}

fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
console.log('Successfully updated univ-v2-academic-group.postman_collection.json');
