import { postModel } from "../../../DB/models/Post.model.js";

import * as dbService from "../../../DB/db.service.js";

export const postList = async (parent, args) => {

  const posts = await dbService.find({ model: postModel , });

  return { message: "Done", statusCode: 200, data: posts };
};