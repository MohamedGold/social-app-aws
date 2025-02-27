import { User } from "../../DB/models/User.model.js";
import { tokenTypes, verifyToken } from "../../utils/security/token.security.js";
import * as dbService from "../../DB/db.service.js";





export const authentication = async ({
  socket = {},
  tokenType = tokenTypes.access,
  accessRoles = [],
  checkAuthorization = false
} = {}) => {

  const [bearer, token] = socket?.handshake?.auth?.authorization?.split(' ') || [];


  if (!bearer || !token) {

    return { data: { message: "missing Token", status: 400 } };
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
    return { data: { message: "missing signature", status: 400 } };
  }



  if (!decoded?.id) {

    return { data: { message: "In-valid token payload", status: 401 } };
  }


  const user = await dbService.findOne({ model: User, filter: { _id: decoded.id, isDeleted: { $exists: false } } });


  if (!user) {
    return { data: { message: "User not found or deleted", status: 404 } };


  }


  if (user.changeCredentialsTime?.getTime() >= decoded.iat * 1000) {

    return { data: { message: "In-valid login  Credentials", status: 400 } };

  }

  if (checkAuthorization && accessRoles.includes(user.role)) {
    return { data: { message: "Not Authorized Account", status: 403 } };

  }


  return { data: { message: "Done", user }, valid: true };
};




