import request from "supertest";
import app from "../app.js";
import sequelize from "../database/sequelizeConfig.js";

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjQ2LCJlbWFpbCI6ImFhZGkyOHg2QGdtYWlsLmNvbSIsInVzZXJOYW1lIjoiQWFkaSBLaXJhbiBNYWhhamFuaSIsImRlZmF1bHRJbnN0aXR1dGVJZCI6MTIsImRlZmF1bHRBY2FkZW1pY1llYXJJZCI6NjAsInVuaXZlcnNpdHlJZCI6NCwiZGVmYXVsdFJvbGUiOiJDTElFTlRfQURNSU4iLCJzdGF0dXMiOiJhY3RpdmUiLCJ0b2tlblR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3OTI1Nzk3NjIsImV4cCI6MTc5MjU4MDY2Mn0.f9CludEn6Uw_ef-jVcYS1Bo5TN116u2VJ-DfitUBmnQ";

describe("GET /student/all", () => {
    afterAll(async () => {
        await sequelize.close();
    });

    /**
     * 1. create university
     * 2. user create
     * 3. login
     * 4. create student
     * 5. get all student.
     */

    it("should return status 200 with HttpOnly cookie", async () => {
        const response = await request(app)
            .get("/student/all")
            .set("Cookie", `accessToken=${token}`);

        expect(response.status).toBe(200);
    });
}); 