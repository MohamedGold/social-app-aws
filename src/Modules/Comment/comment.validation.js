import joi from 'joi';
import { generalFields } from '../../Middleware/validation.middleware.js';




export const createComment = joi.object().keys({
  postId: generalFields.id.required(),
  commentId: generalFields.id,
  content: joi.string().min(2).max(50000).trim(),
  file: joi.array().items(generalFields.file).max(2)
}).or("file", "content");



export const updateComment = joi.object().keys({
  postId: generalFields.id.required(),
  commentId: generalFields.id.required(),
  content: joi.string().min(2).max(50000).trim(),
  file: joi.array().items(generalFields.file).max(2)
}).or("file", "content");



export const freezeComment = joi.object().keys({
  postId: generalFields.id.required(),
  commentId: generalFields.id.required(),

}).required();



export const likeComment = joi.object().keys({
  action: joi.string().valid("like", "unlike"),
  postId: generalFields.id.required(),
  commentId: generalFields.id.required(),


}).required();