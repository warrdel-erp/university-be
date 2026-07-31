import fs from 'fs';

const filePath = 'c:/Users/gaura/Downloads/warrdel_git_repos_clone_folder/university-be/docs/postman/univ-v2-academic-group.postman_collection.json';

const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const academicRegulationFolder = {
  "name": "Academic Regulation",
  "item": [
    {
      "name": "1. POST /academicRegulation — Create Academic Regulation",
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
            "regulationCode": "AR-2026-BCH",
            "regulationName": "Academic Regulation 2026 B.Tech",
            "description": "Standard Academic Regulation for Batch 2026",
            "courseId": 34,
            "academicYearId": 60,
            "applicableBatch": "2026-2030",
            "effectiveFrom": "2026-07-01",
            "effectiveUntil": "2030-06-30",
            "gradingSchemeId": 1,
            "status": "DRAFT",
            "isActive": true
          }, null, 2)
        },
        "url": {
          "raw": "{{baseurl}}/academicRegulation",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "academicRegulation"
          ]
        },
        "description": "**POST /academicRegulation**\n\nCreates a new academic regulation record with initial version 1.0."
      },
      "response": [
        {
          "name": "201 — Academic Regulation Created",
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
                "regulationCode": "AR-2026-BCH",
                "regulationName": "Academic Regulation 2026 B.Tech",
                "description": "Standard Academic Regulation for Batch 2026",
                "courseId": 34,
                "academicYearId": 60,
                "applicableBatch": "2026-2030",
                "effectiveFrom": "2026-07-01",
                "effectiveUntil": "2030-06-30",
                "gradingSchemeId": 1,
                "status": "DRAFT",
                "isActive": true
              }, null, 2)
            },
            "url": {
              "raw": "{{baseurl}}/academicRegulation",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "academicRegulation"
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
            "success": true,
            "message": "Academic regulation created successfully",
            "data": {
              "academicRegulationId": 1,
              "regulationCode": "AR-2026-BCH",
              "regulationName": "Academic Regulation 2026 B.Tech",
              "description": "Standard Academic Regulation for Batch 2026",
              "courseId": 34,
              "academicYearId": 60,
              "applicableBatch": "2026-2030",
              "effectiveFrom": "2026-07-01",
              "effectiveUntil": "2030-06-30",
              "gradingSchemeId": 1,
              "version": 1.0,
              "status": "DRAFT",
              "isActive": true,
              "instituteId": 12,
              "universityId": 4,
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
      "name": "2. GET /academicRegulation — List Academic Regulations",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseurl}}/academicRegulation?search=AR-2026&courseId=34&page=1&limit=10",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "academicRegulation"
          ],
          "query": [
            {
              "key": "search",
              "value": "AR-2026"
            },
            {
              "key": "courseId",
              "value": "34"
            },
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "10"
            }
          ]
        },
        "description": "**GET /academicRegulation**\n\nReturns paginated list of academic regulations."
      },
      "response": [
        {
          "name": "200 — Regulations List Fetched",
          "originalRequest": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseurl}}/academicRegulation?search=AR-2026&courseId=34&page=1&limit=10",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "academicRegulation"
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
            "success": true,
            "message": "Academic regulations fetched successfully",
            "data": [
              {
                "academicRegulationId": 1,
                "regulationCode": "AR-2026-BCH",
                "regulationName": "Academic Regulation 2026 B.Tech",
                "courseId": 34,
                "version": 1.0,
                "status": "DRAFT",
                "isActive": true
              }
            ],
            "meta": {
              "page": 1,
              "limit": 10,
              "total": 1
            }
          }, null, 2)
        }
      ]
    },
    {
      "name": "3. GET /academicRegulation/:academicRegulationId — Get Single Regulation",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{baseurl}}/academicRegulation/1",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "academicRegulation",
            "1"
          ]
        },
        "description": "**GET /academicRegulation/:academicRegulationId**\n\nReturns single academic regulation details."
      },
      "response": [
        {
          "name": "200 — Single Regulation Fetched",
          "originalRequest": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseurl}}/academicRegulation/1",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "academicRegulation",
                "1"
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
            "success": true,
            "message": "Academic regulation fetched successfully",
            "data": {
              "academicRegulationId": 1,
              "regulationCode": "AR-2026-BCH",
              "regulationName": "Academic Regulation 2026 B.Tech",
              "courseId": 34,
              "version": 1.0,
              "status": "DRAFT",
              "isActive": true
            }
          }, null, 2)
        }
      ]
    },
    {
      "name": "4. PUT /academicRegulation/:academicRegulationId — Update Academic Regulation (version +0.1)",
      "request": {
        "method": "PUT",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": JSON.stringify({
            "regulationName": "Academic Regulation 2026 B.Tech Updated",
            "courseId": 34,
            "status": "PUBLISHED"
          }, null, 2)
        },
        "url": {
          "raw": "{{baseurl}}/academicRegulation/1",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "academicRegulation",
            "1"
          ]
        },
        "description": "**PUT /academicRegulation/:academicRegulationId**\n\nUpdates academic regulation record and increments version by +0.1 (e.g. 1.0 -> 1.1)."
      },
      "response": [
        {
          "name": "200 — Academic Regulation Updated (version incremented)",
          "originalRequest": {
            "method": "PUT",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": JSON.stringify({
                "regulationName": "Academic Regulation 2026 B.Tech Updated",
                "courseId": 34,
                "status": "PUBLISHED"
              }, null, 2)
            },
            "url": {
              "raw": "{{baseurl}}/academicRegulation/1",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "academicRegulation",
                "1"
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
            "success": true,
            "message": "Academic regulation updated successfully",
            "data": {
              "academicRegulationId": 1,
              "regulationCode": "AR-2026-BCH",
              "regulationName": "Academic Regulation 2026 B.Tech Updated",
              "courseId": 34,
              "version": 1.1,
              "status": "PUBLISHED",
              "isActive": true
            }
          }, null, 2)
        }
      ]
    },
    {
      "name": "5. DELETE /academicRegulation/:academicRegulationId — Delete Academic Regulation",
      "request": {
        "method": "DELETE",
        "header": [],
        "url": {
          "raw": "{{baseurl}}/academicRegulation/1",
          "host": [
            "{{baseurl}}"
          ],
          "path": [
            "academicRegulation",
            "1"
          ]
        },
        "description": "**DELETE /academicRegulation/:academicRegulationId**\n\nSoft deletes academic regulation record."
      },
      "response": [
        {
          "name": "200 — Academic Regulation Deleted",
          "originalRequest": {
            "method": "DELETE",
            "header": [],
            "url": {
              "raw": "{{baseurl}}/academicRegulation/1",
              "host": [
                "{{baseurl}}"
              ],
              "path": [
                "academicRegulation",
                "1"
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
            "success": true,
            "message": "Academic regulation deleted successfully"
          }, null, 2)
        }
      ]
    }
  ]
};

const existingIdx = content.item.findIndex(i => i.name === 'Academic Regulation');
if (existingIdx >= 0) {
  content.item[existingIdx] = academicRegulationFolder;
} else {
  content.item.push(academicRegulationFolder);
}

fs.writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf8');
console.log('Successfully updated Postman collection with courseId key');
