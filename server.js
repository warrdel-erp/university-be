import express, { json, urlencoded } from 'express';
import cors from 'cors';
const app = express();
const PORT = process.env.PORT || 8080;
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
dotenv.config();

import main from './router/mainRoute.js';
import setting from './router/settingRoute.js';
import student from './router/studentRoute.js';
import download from './router/downloadRoute.js';
import codeMaster from './router/codeMasterRoute.js';
import user from './router/auth/userRoute.js';
import employee from './router/employeeRoute.js'


// middleware
app.use(fileUpload());
app.use(json());
app.use(cors());
app.use(urlencoded({ extended: true }));

//routes
app.use("/main", main);
app.use("/setting", setting);
app.use("/student", student);
app.use("/download", download);
app.use("/codeMaster",codeMaster);
app.use("/user",user);
app.use("/employee",employee);


app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`)
});