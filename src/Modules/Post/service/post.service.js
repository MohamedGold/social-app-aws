import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { postModel } from "../../../DB/models/Post.model.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { roleTypes, socketConnection, User } from "../../../DB/models/User.model.js";
import { commentModel } from "../../../DB/models/Comment.model.js";
import { populate } from "dotenv";
import { paginate } from "../../../utils/pagination.js";
import { getIo } from "../../Socket/socket.controller.js";





export const getPostsList = asyncHandler(async (req, res, next) => {

  let { page, size } = req.query;


  const data = await paginate({
    page, size, model: postModel,
    filter: {
      isDeleted: { $exists: false }
    },
    populate: [{
      path: 'comments',
      match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
      populate: [{
        path: "reply",
        match: { isDeleted: { $exists: false } },

      }]
    }],
  });

 


  return successResponse({ res, status: 200, data });

});


export const getPosts = asyncHandler(async (req, res, next) => {
  let { page, size } = req.query;

  // Retrieve users who have blocked the current user
  const blockers = await dbService.find({
    model: User,
    filter: { blockedUsers: req.user._id },
    select: "_id"
  });
  const blockersIds = blockers.map(user => user._id);

  // Retrieve the list of users that the current user has blocked
  let blockeesIds = [];
  if (req.user.blockedUsers && req.user.blockedUsers.length) {
    blockeesIds = req.user.blockedUsers;
  } else {
    const currentUserData = await dbService.findOne({
      model: User,
      filter: { _id: req.user._id },
      select: "blockedUsers"
    });
    if (currentUserData && currentUserData.blockedUsers) {
      blockeesIds = currentUserData.blockedUsers;
    }
  }

  const data = await paginate({
    page,
    size,
    model: postModel,
    filter: {
      isDeleted: { $exists: false },
      createdBy: { $nin: blockersIds.concat(blockeesIds) }
    },
    populate: [{
      path: 'comments',
      match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
      populate: [{
        path: "reply",
        match: { isDeleted: { $exists: false } }
      }]
    }],
  });

  return successResponse({ res, data });
});


export const createPost = asyncHandler(async (req, res, next) => {
  const { content } = req.body;


  let attachments = [];
  for (const file of req.files) {
    const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: `${process.env.APP_NAME}/POST` });
    attachments.push({ secure_url, public_id });
  }

  const post = await dbService.create({
    model: postModel,
    data: {
      content,
      attachments,
      createdBy: req.user._id
    }
  });


  return successResponse({ res, status: 201, data: { post } });

});



export const updatePost = asyncHandler(async (req, res, next) => {



  let attachments = [];

  if (req.files.length) {
    for (const file of req.files) {
      const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: `${process.env.APP_NAME}/POST` });
      attachments.push({ secure_url, public_id });
    }

    req.body.attachments = attachments;

  }



  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: { _id: req.params.postId, isDeleted: { $exists: false }, createdBy: req.user._id },
    data: {
      ...req.body,
      updatedBy: req.user._id
    },
    option: {
      new: true
    }
  });


  return post ? successResponse(
    { res, status: 200, data: { post } }) :
    next(new Error("post not found ",
      { cause: 404 }));

});


export const freezePost = asyncHandler(async (req, res, next) => {


  const owner = req.user.role === roleTypes.admin ? {} : { createdBy: req.user._id };

  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: false },
      ...owner

    },
    data: {
      isDeleted: new Date(),
      deletedBy: req.user._id
    },
    option: {
      new: true
    }
  });


  return post ? successResponse(
    { res, status: 200, data: { post } }) :
    next(new Error("post not found ",
      { cause: 404 }));

});



export const undoPost = asyncHandler(async (req, res, next) => {

  const post = await dbService.findOne({
    model: postModel,
    filter: {
      _id: req.params.postId,
      deletedBy: req.user._id,
      isDeleted: { $exists: true }
    }
  });


  const postIsDeleted = await dbService.findOne({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: false }
    }
  });


  if (postIsDeleted) {
    return next(new Error("post already exist", { cause: 400 }));
  }

  if (!post) {
    return next(new Error("Post not found or not deleted by you", { cause: 404 }));
  }


  const deletedAtTime = post.isDeleted instanceof Date ? post.isDeleted.getTime() : new Date(post.isDeleted).getTime();

  if (isNaN(deletedAtTime)) {
    return next(new Error("Invalid post deletion data", { cause: 500 }));
  }

  const nowTime = Date.now();
  const twoMinutes = 2 * 60 * 1000;

  if ((nowTime - deletedAtTime) > twoMinutes) {
    return next(new Error("Cannot undo post after 2 minutes", { cause: 400 }));
  }

  const updatedPost = await dbService.findOneAndUpdate({
    model: postModel,
    filter: { _id: req.params.postId },
    data: {
      $unset: { isDeleted: "", deletedBy: "" },
      $set: { updatedBy: req.user._id },
      updatedBy: req.params.postId

    },
    options: { new: true }
  });

  return successResponse({ res, message: "Post Undone Successfully", status: 200, data: { post: updatedPost } });
});


export const archivePost = asyncHandler(async (req, res, next) => {
  // Find the post that is not deleted
  const post = await dbService.findOne({
    model: postModel,
    filter: { _id: req.params.postId, isDeleted: { $exists: false } }
  });

  if (!post) {
    return next(new Error("Post not found", { cause: 404 }));
  }

  // Check if 24 hours have passed since creation
  const createdAtTime = new Date(post.createdAt).getTime();
  const nowTime = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  if ((nowTime - createdAtTime) < twentyFourHours) {
    return next(new Error("Cannot archive post before 24 hours", { cause: 400 }));
  }

  // Archive the post by setting archivedAt
  const updatedPost = await dbService.findOneAndUpdate({
    model: postModel,
    filter: { _id: req.params.postId },
    data: { archivedAt: new Date() },
    option: { new: true }
  });

  return successResponse({ res, status: 200, data: { post: updatedPost } });
});


export const likePost = asyncHandler(async (req, res, next) => {


  const data = req.query.action === "unlike" ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } };

  const post = await dbService.findOneAndUpdate({
    model: postModel,
    filter: {
      _id: req.params.postId,
      isDeleted: { $exists: false },

    },
    data,
    option: {
      new: true
    }
  });

  if (!post) {
    next(new Error("post not found ", { cause: 404 }));
  }

  getIo().to(socketConnection.get(post.createdBy.toString())).emit("likePost", {
    postId: req.params.postId,
    userId: req.user._id,
    action: req.query.action
  });

  return successResponse({ res, status: 200, data: { post } });


});




export const getMyPosts = asyncHandler(async (req, res, next) => {
  let { page, size } = req.query;
  const data = await paginate({
    page,
    size,
    model: postModel,
    filter: {
      isDeleted: { $exists: false },
      createdBy: req.user._id
    },
    populate: [{
      path: 'comments',
      match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
      populate: [{
        path: "reply",
        match: { isDeleted: { $exists: false } }
      }]
    }],
  });
  return successResponse({ res, data });
});

export const getFriendsPosts = asyncHandler(async (req, res, next) => {
  let { page, size } = req.query;
  // Assuming req.user.friends exists and is an array of friend IDs
  const friendIds = req.user.friends || [];
  const data = await paginate({
    page,
    size,
    model: postModel,
    filter: {
      isDeleted: { $exists: false },
      createdBy: { $in: friendIds }
    },
    populate: [{
      path: 'comments',
      match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
      populate: [{
        path: "reply",
        match: { isDeleted: { $exists: false } }
      }]
    }],
  });
  return successResponse({ res, data });
});



export const getPostsForUsers = asyncHandler(async (req, res, next) => {
  let { page, size, userIds } = req.query;
  if (!userIds) {
    return next(new Error("User IDs are required", { cause: 400 }));
  }
  const ids = userIds.split(',').map(id => id.trim());
  const data = await paginate({
    page,
    size,
    model: postModel,
    filter: {
      isDeleted: { $exists: false },
      createdBy: { $in: ids }
    },
    populate: [{
      path: 'comments',
      match: { isDeleted: { $exists: false }, commentId: { $exists: false } },
      populate: [{
        path: "reply",
        match: { isDeleted: { $exists: false } }
      }]
    }],
  });
  return successResponse({ res, data });
});
