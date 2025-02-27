import { postModel } from "../../../DB/models/Post.model.js";

import * as dbService from "../../../DB/db.service.js";
import { authentication } from "../../../Middleware/graph/auth.graph.middleware.js";
import { validation } from "../../../Middleware/graph/validation.graph.middleware.js";
import { likePostGraph } from "../post.validation.js";

export const likePost = async (parent, args) => {

  const { postId, action, authorization } = args;
  
  await validation(likePostGraph, args)

  const user = await authentication({ authorization });

  console.log({ postId, user });

  const data = action === "unlike" ? { $pull: { likes: user._id } } : { $addToSet: { likes: user._id } };

  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: postId,
    },
    data,
    option: { new: true }
  });

  return { message: "Done", statusCode: 200, data: post };
};