import { User } from "../../DB/models/User.model.js";
import { tokenTypes, verifyToken } from "../../utils/security/token.security.js";
import * as dbService from "../../DB/db.service.js"





export const authentication = async ({
  authorization = "",
  tokenType = tokenTypes.access,
  accessRoles = [],
  checkAuthorization = false
} = {}) => {

  const [bearer, token] = authorization?.split(' ') || [];


  if (!bearer || !token) {

    throw new Error("missing token ");
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
      throw new Error("Invalid Bearer type", { cause: 400 });
  }

  const decoded = verifyToken({ token, signature: tokenType == tokenTypes.access ? access_signature : refresh_signature },);


  if (!access_signature || !refresh_signature) {
    throw new Error("Missing signature");
  }



  if (!decoded?.id) {

    throw new Error("In-valid token payload");
  }


  const user = await dbService.findOne({ model: User, filter: { _id: decoded.id, isDeleted: { $exists: false } } });


  if (!user) {
    throw new Error("User not found or deleted");
  }


  if (user.changeCredentialsTime?.getTime() >= decoded.iat * 1000) {

    throw new Error("In-valid login Credentials");
  }

  if(checkAuthorization && accessRoles.includes(user.role)){
    throw new Error("Not Authorized account")
  }


  return user;
};




