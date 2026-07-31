import fs from 'fs';
import path from 'path';

const postmanPath = path.resolve('docs/postman/univ-v2-grading-schemas.postman_collection.json');
const collection = JSON.parse(fs.readFileSync(postmanPath, 'utf8'));

// 1. Add Academic Regulation Folder
const academicRegulationFolder = {
  name: "4. Academic Regulation",
  item: [
    {
      name: "4.1 Create Academic Regulation",
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            regulationCode: "REG_2026_CS",
            regulationName: "Computer Science Academic Regulation 2026",
            description: "Regulation policy covering course requirements and grading schemes.",
            courseId: 35,
            academicYearId: 1,
            applicableBatch: "2026-2030",
            effectiveFrom: "2026-08-01",
            effectiveUntil: "2030-07-31",
            gradingSchemeId: "{{gradingSchemaId}}",
            status: "DRAFT",
            isActive: true
          }, null, 2)
        },
        url: {
          raw: "{{baseurl}}/academicRegulation",
          host: ["{{baseurl}}"],
          path: ["academicRegulation"]
        }
      }
    },
    {
      name: "4.2 Get All Academic Regulations",
      request: {
        method: "GET",
        header: [
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        url: {
          raw: "{{baseurl}}/academicRegulation?courseId=35&status=DRAFT",
          host: ["{{baseurl}}"],
          path: ["academicRegulation"],
          query: [
            { key: "courseId", value: "35" },
            { key: "status", value: "DRAFT" }
          ]
        }
      }
    },
    {
      name: "4.3 Get Single Academic Regulation",
      request: {
        method: "GET",
        header: [
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        url: {
          raw: "{{baseurl}}/academicRegulation/single?academicRegulationId={{academicRegulationId}}",
          host: ["{{baseurl}}"],
          path: ["academicRegulation", "single"],
          query: [
            { key: "academicRegulationId", value: "{{academicRegulationId}}" }
          ]
        }
      }
    },
    {
      name: "4.4 Update Academic Regulation",
      request: {
        method: "PATCH",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            academicRegulationId: "{{academicRegulationId}}",
            regulationName: "Computer Science Academic Regulation 2026 Updated",
            status: "PUBLISHED"
          }, null, 2)
        },
        url: {
          raw: "{{baseurl}}/academicRegulation",
          host: ["{{baseurl}}"],
          path: ["academicRegulation"]
        }
      }
    },
    {
      name: "4.5 Delete Academic Regulation",
      request: {
        method: "DELETE",
        header: [
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        url: {
          raw: "{{baseurl}}/academicRegulation/{{academicRegulationId}}",
          host: ["{{baseurl}}"],
          path: ["academicRegulation", "{{academicRegulationId}}"]
        }
      }
    }
  ]
};

// 2. Add Exam Setup Types Folder (/examStructure/examType)
const examSetupTypeFolder = {
  name: "5. Exam Setup Types (/examStructure/examType)",
  item: [
    {
      name: "5.1 Create Exam Setup Type",
      request: {
        method: "POST",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            examName: "Mid Term Assessment",
            examCode: "MID_2026",
            examCategory: "EXAMINATION",
            examSubcategory: "Mid Term",
            examDescription: "Mid term examination for semester 1",
            courseId: 35,
            sessionId: 18,
            maximumAssessment: 50
          }, null, 2)
        },
        url: {
          raw: "{{baseurl}}/examStructure/examType",
          host: ["{{baseurl}}"],
          path: ["examStructure", "examType"]
        }
      }
    },
    {
      name: "5.2 Get Detail By Exam Type ID",
      request: {
        method: "GET",
        header: [
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        url: {
          raw: "{{baseurl}}/examStructure/examType?examSetupTypeId={{examSetupTypeId}}",
          host: ["{{baseurl}}"],
          path: ["examStructure", "examType"],
          query: [
            { key: "examSetupTypeId", value: "{{examSetupTypeId}}" }
          ]
        }
      }
    },
    {
      name: "5.3 Get Single Exam Type By Course & Session",
      request: {
        method: "GET",
        header: [
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        url: {
          raw: "{{baseurl}}/examStructure/examType/single?courseId=35&sessionId=18",
          host: ["{{baseurl}}"],
          path: ["examStructure", "examType", "single"],
          query: [
            { key: "courseId", value: "35" },
            { key: "sessionId", value: "18" }
          ]
        }
      }
    },
    {
      name: "5.4 Update Exam Setup Type",
      request: {
        method: "PATCH",
        header: [
          { key: "Content-Type", value: "application/json" },
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            examSetupTypeId: "{{examSetupTypeId}}",
            examName: "Updated Mid Term Assessment",
            maximumAssessment: 60
          }, null, 2)
        },
        url: {
          raw: "{{baseurl}}/examStructure/examType",
          host: ["{{baseurl}}"],
          path: ["examStructure", "examType"]
        }
      }
    },
    {
      name: "5.5 Delete Exam Setup Type",
      request: {
        method: "DELETE",
        header: [
          { key: "Authorization", value: "Bearer {{token}}" }
        ],
        url: {
          raw: "{{baseurl}}/examStructure/examType/{{examSetupTypeId}}",
          host: ["{{baseurl}}"],
          path: ["examStructure", "examType", "{{examSetupTypeId}}"]
        }
      }
    }
  ]
};

// Filter out existing 4 or 5 folders if already added
collection.item = collection.item.filter(item => !item.name.startsWith("4.") && !item.name.startsWith("5."));
collection.item.push(academicRegulationFolder);
collection.item.push(examSetupTypeFolder);

// Add collection variables if missing
const varKeys = collection.variable.map(v => v.key);
if (!varKeys.includes("academicRegulationId")) {
  collection.variable.push({ key: "academicRegulationId", value: "1", type: "string" });
}
if (!varKeys.includes("examSetupTypeId")) {
  collection.variable.push({ key: "examSetupTypeId", value: "1", type: "string" });
}

fs.writeFileSync(postmanPath, JSON.stringify(collection, null, 2));
console.log("Successfully updated docs/postman/univ-v2-grading-schemas.postman_collection.json");
