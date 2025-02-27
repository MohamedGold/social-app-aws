
import * as postService from "./service/post.service.js";
import * as validators from "./post.validation.js";
import { validation } from "../../Middleware/validation.middleware.js";
import { authentication, authorization } from "../../Middleware/auth.middleware.js";
import { endpoint } from "./post.authorization.js";
import { Router } from "express";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { fileValidations } from "../../utils/multer/local.multer.js";
import commentController from "../Comment/comment.controller.js";

const postController = Router();

// comment to post
postController.use('/:postId/comment', commentController)


// get posts
postController.get("/",
  authentication(),
  postService.getPosts
);

// get posts List
postController.get("/list",
  // authentication(),
  postService.getPostsList
);


//create post
postController.post("/",
  authentication(),
  authorization(endpoint.createPost),
  uploadCloudFile(fileValidations.image).array("attachment", 2),
  validation(validators.createPost),
  postService.createPost
);





// update post
postController.patch("/:postId",
  authentication(),
  authorization(endpoint.createPost),
  uploadCloudFile(fileValidations.image).array("attachment", 2),
  validation(validators.updatePost),
  postService.updatePost
);


// freeze post
postController.delete("/:postId",
  authentication(),
  authorization(endpoint.freezePost),
  validation(validators.freezePost),
  postService.freezePost
);

// Undo post 
postController.patch("/:postId/undo",
  authentication(),
  authorization(endpoint.undoPost),
  validation(validators.undoPost),
  postService.undoPost
);



// Archive post (only if 24 hours have passed)
postController.patch("/:postId/archive",
  authentication(),
  authorization(endpoint.archivePost),
  validation(validators.archivePost), // create validator if needed
  postService.archivePost
);

// like post
postController.patch("/:postId/like",
  authentication(),
  authorization(endpoint.likePost),
  validation(validators.likePost),
  postService.likePost
);






// Get public posts that the user owned
postController.get("/myposts",
  authentication(),
  postService.getMyPosts
);

// Get public posts for user's friends
postController.get("/friends",
  authentication(),
  postService.getFriendsPosts
);

// Get public posts for specific users (pass userIds as comma-separated values in query)
postController.get("/specific",
  authentication(),
  postService.getPostsForUsers
);



export default postController;