import jwt from "jsonwebtoken";
import { User } from "../../DB/models/User.model.js";
import * as dbService from "../../DB/db.service.js";

export const tokenTypes = {
  access: "access",
  refresh: "refresh"
};

export const decodedToken = async ({ authorization = "", tokenType = tokenTypes.access, next = {} } = {}) => {

  const [bearer, token] = authorization?.split(' ') || [];


  if (!bearer || !token) {

    return next(new Error("missing token ", { cause: 400 }));
  }


  let access_signature = '';
  let refresh_signature = '';

  switch (bearer) {
    case "System":
      access_signature = process.env.ADMIN_ACCESS_TOKEN;
      refresh_signature = process.env.ADMIN_REFRESH_TOKEN;
      break;

    case "Bearer":
      access_signature = process.env.USER_ACCESS_TOKEN;
      refresh_signature = process.env.USER_REFRESH_TOKEN;

      break;

    default:
      return next(new Error("Invalid Bearer type", { cause: 400 }));
  }

  const decoded = verifyToken({ token, signature: tokenType == tokenTypes.access ? access_signature : refresh_signature },);


  if (!access_signature || !refresh_signature) {
    return next(new Error("Missing signature", { cause: 500 }));
  }



  if (!decoded?.id) {

    return next(new Error("In-valid token payload", { cause: 401 }));
  }


  const user = await dbService.findOne({ model: User, filter: { _id: decoded.id, isDeleted: { $exists: false } } });


  if (!user) {
    return next(new Error("User not found or deleted", { cause: 404 }));
  }


  if (user.changeCredentialsTime?.getTime() >= decoded.iat * 1000) {

    return next(new Error("Invalid refresh token. Please log in again", { cause: 400 }));
  }


  return user;
};




export const generateToken = ({ payload = {}, signature = process.env.USER_ACCESS_TOKEN, expiresIn = process.env.EXPIRESIN }) => {

  const token = jwt.sign(payload, signature, { expiresIn: parseInt(expiresIn) });

  return token;
};




export const verifyToken = ({ token, signature = process.env.USER_ACCESS_TOKEN, }) => {

  const decodedToken = jwt.verify(token, signature);

  return decodedToken;
};