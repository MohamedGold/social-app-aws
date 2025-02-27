import cloudinary from "cloudinary"
import path from "node:path";

import { config } from "dotenv";
config();

cloudinary.v2.config({
  cloud_name : process.env.cloud_name,
  api_key : process.env.api_key,
  api_secret : process.env.api_secret,
  secure: true,
})



export const cloud = cloudinary.v2 