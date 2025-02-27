import { roleTypes } from "../../DB/models/User.model.js";





export const endpoint = {
  create: [roleTypes.user],
  update: [roleTypes.user],
  freeze: [roleTypes.user, roleTypes.admin],
  likeComment: [roleTypes.user, roleTypes.admin]
};