import { roleTypes } from "../../DB/models/User.model.js";



export const endpoint = {

  createPost: [roleTypes.user],
  freezePost: [roleTypes.user, roleTypes.admin],
  undoPost: [roleTypes.user, roleTypes.admin],
  archivePost: [roleTypes.user, roleTypes.admin],
  likePost: [roleTypes.user, roleTypes.admin],
};