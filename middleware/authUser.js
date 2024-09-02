import jwt from "jsonwebtoken";
import { findEmailByEmail } from "../repository/userRepository.js";

const SECRET_KEY = 'warrdelUniversityERPWarrdelUniversityERP';

export default async function useAuth(req, res, next) {

    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const { email } = decoded;

        if (!email) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const userDetail = await findEmailByEmail(email);

        if (!userDetail) {
            return res.status(401).json({ message: "Invalid user" });
        }

        req.user = userDetail;
        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
};