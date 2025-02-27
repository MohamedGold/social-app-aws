import { authentication, authorization } from "../../Middleware/auth.middleware.js";
import { validation } from "../../Middleware/validation.middleware.js";
import { fileValidations, uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { endpoint } from "./comment.authorization.js";
import * as commentService from "./service/comment.service.js";
import * as validators from "./comment.validation.js";
import { Router } from "express";

const commentController = Router({
  mergeParams: true,
  strict: false,
  caseSensitive: true
});




commentController.get("/",
  authentication(),
  commentService.getComments);



commentController.post("/:commentId?",
  authentication(),
  authorization(endpoint.create),
  uploadCloudFile(fileValidations.image).array("attachment", 2),
  validation(validators.createComment),
  commentService.createComment);


commentController.patch("/:commentId",
  authentication(),
  authorization(endpoint.update),
  uploadCloudFile(fileValidations.image).array("attachment", 2),
  validation(validators.updateComment),
  commentService.updateComment);



commentController.delete("/:commentId/freeze",
  authentication(),
  authorization(endpoint.freeze),
  validation(validators.freezeComment),
  commentService.freezeComment);


commentController.patch("/:commentId/un-freeze",
  authentication(),
  authorization(endpoint.freeze),
  validation(validators.freezeComment),
  commentService.unFreezeComment);




commentController.patch("/:commentId/like",
  authentication(),
  authorization(endpoint.likeComment),
  validation(validators.likeComment),
  commentService.likeComment);


export default commentController;  