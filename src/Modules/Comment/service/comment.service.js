import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { postModel } from "../../../DB/models/Post.model.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { commentModel } from "../../../DB/models/Comment.model.js";
import { roleTypes, User } from "../../../DB/models/User.model.js";


// export const createComment = asyncHandler(async (req, res, next) => {

//   const { postId , commentId } = req.params;


//   if(commentId && ! await dbService.findOne({
//     model:commentModel,
//     filter:{_id : commentId , postId, isDeleted: {$exists: false}} 
//   })){
//     return next( new Error("In-valid parent comment"))
//   }

//   const post = await dbService.findOne({
//     model: postModel,
//     filter: { _id: postId, isDeleted: { $exists: false } }
//   });


//   if (!post) {

//     return next(new Error("In-valid post ID or Deleted", { cause: 404 }));
//   }

//   if (req.files?.length) {
//     const attachments = [];

//     for (const file of req.files) {
//       const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
//         folder: `${process.env.APP_NAME}/user/${post.createdBy}/post/${postId}/comment`
//       });
//       attachments.push({ secure_url, public_id });

//     }

//     req.body.attachments = attachments;

//   }

//   const comment = await dbService.create({
//     model: commentModel,
//     data: {
//       ...req.body,
//       postId,
//       commentId,
//       createdBy: req.user._id
//     }
//   });

//   // await dbService.updateOne({
//   //   model: postModel,
//   //   filter:{_id: postId},

//   //   data:{$addToSet: {comments: comment._id}}
//   // })

//   return successResponse({ res, status: 201, data: { comment } });
// });


export const createComment = asyncHandler(async (req, res, next) => {

  const { postId, commentId } = req.params;


  if (commentId && ! await dbService.findOne({
    model: commentModel,
    filter: { _id: commentId, postId, isDeleted: { $exists: false } }
  })) {
    return next(new Error("In-valid parent comment"));
  }

  const post = await dbService.findOne({
    model: postModel,
    filter: { _id: postId, isDeleted: { $exists: false } }
  });


  if (!post) {

    return next(new Error("In-valid post ID or Deleted", { cause: 404 }));
  }

  // Check if the post's author blocked the current user
  const postAuthor = await dbService.findOne({
    model: User,
    filter: { _id: post.createdBy },
    select: "blockedUsers"
  });

  if (
    postAuthor &&
    postAuthor.blockedUsers &&
    postAuthor.blockedUsers.some(id => id.toString() === req.user._id.toString())
  ) {
    return next(new Error("the author of post blocked you"));
  }

  // Check if the current user blocked the post's author
  const currentUserData = await dbService.findOne({
    model: User,
    filter: { _id: req.user._id },
    select: "blockedUsers"
  });

  if (
    currentUserData &&
    currentUserData.blockedUsers &&
    currentUserData.blockedUsers.some(id => id.toString() === post.createdBy.toString())
  ) {
    return next(new Error("can't comment on User blocked by you"));
  }

  if (req.files?.length) {
    const attachments = [];

    for (const file of req.files) {
      const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
        folder: `${process.env.APP_NAME}/user/${post.createdBy}/post/${postId}/comment`
      });
      attachments.push({ secure_url, public_id });

    }

    req.body.attachments = attachments;

  }

  const comment = await dbService.create({
    model: commentModel,
    data: {
      ...req.body,
      postId,
      commentId,
      createdBy: req.user._id
    }
  });

  // await dbService.updateOne({
  //   model: postModel,
  //   filter:{_id: postId},
  //   data:{$addToSet: {comments: comment._id}}
  // })

  return successResponse({ res, status: 201, data: { comment } });
});



export const updateComment = asyncHandler(async (req, res, next) => {

  const { postId, commentId } = req.params;

  const comment = await dbService.findOne({
    model: commentModel,
    filter: {
      _id: commentId
      , postId,
      createdBy: req.user._id,
      isDeleted: { $exists: false }
    },
    populate: [{
      path: "postId"
    }]
  });


  if (!comment || comment.postId.isDeleted) {

    return next(new Error("In-valid comment or Deleted", { cause: 404 }));
  }

  if (req.files?.length) {
    const attachments = [];

    for (const file of req.files) {
      const { secure_url, public_id } = await cloud.uploader.upload(file.path, {
        folder: `${process.env.APP_NAME}/user/${comment.createdBy}/post/${postId}/comment`
      });
      attachments.push({ secure_url, public_id });

    }

    req.body.attachments = attachments;

  }

  const savedComment = await dbService.findOneAndUpdate({
    model: commentModel,
    filter: {
      _id: commentId
      , postId,
      createdBy: req.user._id,
      isDeleted: { $exists: false }
    },
    data: {
      ...req.body,

    },
    option: {
      new: true
    }
  });


  return successResponse({ res, status: 200, data: { comment: savedComment } });
});



export const freezeComment = asyncHandler(async (req, res, next) => {

  const { postId, commentId } = req.params;

  const comment = await dbService.findOne({
    model: commentModel,
    filter: {
      _id: commentId
      , postId,
      isDeleted: { $exists: false }
    },
    populate: [{
      path: "postId"
    }]
  });


  if (
    !comment ||
    (comment.createdBy.toString() != req.user._id.toString()
      &&
      comment.postId.createdBy.toString() != req.user._id.toString()
      &&
      req.user.role != roleTypes.admin)
  ) {

    return next(new Error("In-valid comment or not Auth User", { cause: 404 }));
  }



  const deletedComment = await dbService.findOneAndUpdate({
    model: commentModel,
    filter: {
      _id: commentId
      , postId,
      isDeleted: { $exists: false }
    },
    data: {
      isDeleted: Date.now(),
      deletedBy: req.user._id

    },
    option: {
      new: true
    }
  });


  return successResponse({ res, status: 200, data: { comment: deletedComment } });
});



export const unFreezeComment = asyncHandler(async (req, res, next) => {

  const { postId, commentId } = req.params;




  const undoComment = await dbService.findOneAndUpdate({
    model: commentModel,
    filter: {
      _id: commentId
      , postId,
      deletedBy: req.user._id,
      isDeleted: { $exists: true }
    },
    data: {
      $unset: {
        isDeleted: 0,
        deletedBy: 0

      },
      updatedBy: req.user._id

    },
    option: {
      new: true
    }
  });


  return successResponse({ res, status: 200, data: { comment: undoComment } });
});



export const likeComment = asyncHandler(async (req, res, next) => {

  const { postId, commentId } = req.params;
  const data = req.query.action === "unlike" ? { $pull: { likes: req.user._id } } : { $addToSet: { likes: req.user._id } };

  const comment = await dbService.findOneAndUpdate({
    model: commentModel,
    filter: {
      _id: commentId, postId,
      isDeleted: { $exists: false },

    },
    data,
    option: {
      new: true
    }
  });


  return comment ? successResponse(
    { res, status: 200, data: { comment } }) :
    next(new Error("comment not found ",
      { cause: 404 }));

});




export const getComments = asyncHandler(async (req, res, next) => {

  const comments = await dbService.find({
    model: commentModel,
    filter: {
      isDeleted: { $exists: false }
    },
    populate: [
      {
        path: "createdBy",
        select: "username image"
      },
      {
        path: "likes",
        select: "username image"
      },
    ]
  });


  return successResponse({ res, status: 200, data: { comments } });

});
