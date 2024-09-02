import * as userService from "../services/userServices.js";
import * as userRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// register
export const register = async (req, res) => {
  const universityId = 1;
  try {
    const { email, password, userName, phone} = req.body;
    const existingEmail = await userRepository.findEmailByEmail(email);

    // Check if all required fields are provided

    if (!(email && password && userName && phone && universityId)) {
      res.status(400).send("All input is required");

      // Check if email already exists
    } else if (existingEmail) {
      res.status(400).send("Email already exists");

      // register the user
    } else {
      const result = await userService.register(req.body);
      res.status(200).send(result);
    }
  } catch (error) {
    console.error("Error during registration:", error);
    res.status(500).send("Internal server error");
  }
};

// login

export const login = async (req, res) => {
  try {
    let { email, password } = req.body;
    const existingEmail = await userRepository.findEmailByEmail(email);

    if (!existingEmail) {
      return res.status(400).send("Email does not exist");
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      existingEmail.password
    );

    if (!isPasswordCorrect) {
      return res.status(400).send("Incorrect password");
    }

  //  const token = jwt.sign({ email: existingEmail.email }, process.env.SECRET_KEY,{ expiresIn: process.env.TOKEN_TIME });
  const token = jwt.sign({ email: existingEmail.email }, 'warrdelUniversityERPWarrdelUniversityERP',{ expiresIn: '1h'});

   res.cookie("token", token);
   res.status(200).json({
    status: true,
    message: "User logged in successfully",
    token,
  });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).send("Internal server error");
  }
 
};