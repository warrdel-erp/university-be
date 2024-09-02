import * as registerRepository from "../repository/userRepository.js";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from 'uuid';
var salt = bcrypt.genSaltSync(10);

//register
export async function register(info) {
  let { userName, password, phone, email,universityId } = info;
  password = await bcrypt.hashSync(password, salt);

  const data = {
    userName,
    universityId:1,
    password,
    phone,
    email : email.toLowerCase(),
    uniqueId: uuidv4(),
  };

  return await registerRepository.register(data);
};