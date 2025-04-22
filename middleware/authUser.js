import jwt from "jsonwebtoken";
import { findEmailByEmail } from "../repository/userRepository.js";
import { getUserRoleAndPermissionsByUserId } from "../services/userServices.js";
 

const SECRET_KEY = 'warrdelUniversityERPWarrdelUniversityERP';

// export default async function useAuth(req, res, next) {

//     const authHeader = req.headers.authorization;
    
//     if (!authHeader) {
//         return res.status(401).json({ message: "Authorization header missing" });
//     }

//     const token = authHeader.split(" ")[1];
    
//     if (!token) {
//         return res.status(401).json({ message: "Token missing" });
//     }

//     try {
//         const decoded = jwt.verify(token, SECRET_KEY);
//         const { email } = decoded;

//         if (!email) {
//             return res.status(401).json({ message: "Invalid token payload" });
//         }

//         const userDetail = await findEmailByEmail(email);

//         if (!userDetail) {
//             return res.status(401).json({ message: "Invalid user" });
//         }

//         req.user = userDetail;
//         next();
//     } catch (error) {
//         console.error('Token verification failed:', error);
//         return res.status(401).json({ message: "Invalid or expired token" });
//     }
// };


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
        // Decode the token
        const decoded = jwt.verify(token, SECRET_KEY);
        const { email } = decoded;

        if (!email) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        // Fetch user details from email
        const userDetail = await findEmailByEmail(email);
        if (!userDetail) {
            return res.status(401).json({ message: "Invalid user" });
        }

        req.user = userDetail;

        // Fetch user roles and permissions
        const userRoleAndPermissions = await getUserRoleAndPermissionsByUserId(req.user.userId);
console.log(`>>>>>>>>>>>>>>userRoleAndPermissions`,userRoleAndPermissions);

        let role = "";
        let userPermissions = "";
        if (userRoleAndPermissions && userRoleAndPermissions.length !== 0) {
            const { userRole, permissions } = userRoleAndPermissions[0];
            role = userRole.role; // User's role
            userPermissions = permissions.map(permission => permission.permission); // User's permissions
        } else {
            role = "Admin"
            userPermissions ="all"
        }

        const accessRoute = req.originalUrl.split('?')[0].replace(/\/$/, ''); 
        const permissionType = req.method === 'GET' ? 'R/O' : 'R/W';

        console.log(`>>>>>>>>>>>Access Route: ${accessRoute}`);
        console.log(`>>>>>>>>>Role: ${role}`);
        console.log(`>>>>>>>>>>User Permissions: ${userPermissions}`);

        // Role-based access check
        const allowedRolesForRoute = `${accessRoute}-${permissionType}`;

        console.log(`Allowed Roles and Permissions: ${allowedRolesForRoute}`);

        //  required role for this route
        if (!role) {
            return res.status(403).json({ message: "Access denied: Insufficient role" });
        }

        // For non-GET methods
        if (req.method !== 'GET') {
            const requiredPermissions = req.requiredPermissions || [];

            // required permissions
            const hasPermission = requiredPermissions.every(required => userPermissions.includes(required));

            if (!hasPermission) {
                return res.status(403).json({ message: "Access denied: Insufficient permissions" });
            }
        }

        next();
    } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}