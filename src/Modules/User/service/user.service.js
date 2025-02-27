import { asyncHandler } from "../../../utils/response/error.response.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from "../../../DB/db.service.js";
import { roleTypes, User } from "../../../DB/models/User.model.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { cloud } from "../../../utils/multer/cloudinary.multer.js";
import { postModel } from "../../../DB/models/Post.model.js";
import { friendRequestModel } from "../../../DB/models/FriendRequest.model.js";
import { sendEmail } from "../../../utils/email/send.email.js";
import { decodedToken, tokenTypes } from "../../../utils/security/token.security.js";

// add friend request
export const sendFriendRequest = asyncHandler(async (req, res, next) => {

  const { friendId } = req.params;

  const checkUser = await dbService.findOne({
    model: User,
    filter: { _id: friendId, isDeleted: { $exists: false } }
  });

  if (!checkUser) {
    return next(new Error("Not Found", { cause: 404 }));
  }


  // Check if the target user has blocked the current user
  if (
    checkUser.blockedUsers &&
    checkUser.blockedUsers.some(bId => bId.toString() === req.user._id.toString())
  ) {
    return successResponse({ res, message: "this user blocked you" });
  }

  const friendRequest = await dbService.create({
    model: friendRequestModel,
    data: {
      friendId,
      createdBy: req.user._id
    }
  });

  return successResponse({ res, status: 201, data: { friendRequest } });

});



// accept friend request
export const acceptFriendRequest = asyncHandler(async (req, res, next) => {

  const { friendRequestId } = req.params;



  const friendRequest = await dbService.findOneAndDelete({
    model: friendRequestModel,
    filter: {
      _id: friendRequestId,
      status: false,
      friendId: req.user._id
    },

  });


  await dbService.updateOne({
    model: User,
    filter: {
      _id: req.user._id
    },
    data: {
      $addToSet: { friends: friendRequest.createdBy }
    }
  });


  await dbService.updateOne({
    model: User,
    filter: {
      _id: friendRequest.createdBy
    },
    data: {
      $addToSet: { friends: req.user._id }
    }
  });


  return successResponse({ res, status: 200, data: {} });

});





// who visit me
export const profile = asyncHandler(async (req, res, next) => {

  const user = await dbService.findOne({
    model: User,
    filter: { _id: req.user._id },
    populate: [
      { path: "friends", select: "username image" }
    ]
  });
  return successResponse({ res, data: { user } });
});



// Dashboard
export const dashboard = asyncHandler(async (req, res, next) => {



  const results = await Promise.allSettled([await dbService.find({
    model: User,
    filter: {},
    populate: [{
      path: "viewers.userId",
      select: "username image "
    }]
  }), await dbService.find({
    model: postModel,
    filter: {},

  })]);


  const responseData = {
    Users: results[0].status === "fulfilled" ? results[0].value : [],
    Posts: results[1].status === "fulfilled" ? results[1].value : []
  };




  return successResponse({ res, data: responseData });
});


//Change Role
export const changeRoles = asyncHandler(async (req, res, next) => {

  const { userId } = req.params;

  const { role } = req.body;

  const roles = req.user.role === roleTypes.superAdmin ? { role: { $nin: [roleTypes.superAdmin] } } : { role: { $nin: [roleTypes.admin, roleTypes.superAdmin] } };

  const user = await dbService.findOneAndUpdate({
    model: User,
    filter: {
      _id: userId,
      isDeleted: { $exists: false },
      ...roles

    },
    data: {
      role,
      updateBy: req.user._id
    },
    option: { new: true }
  });
  return successResponse({ res, data: { user } });
});





// update profile
export const updateProfile = asyncHandler(async (req, res, next) => {


  if (req.body.DOB) {
    const birthDate = new Date(req.body.DOB);
    const currentDate = new Date();
    const age = currentDate.getFullYear() - birthDate.getFullYear();

    req.body.age = age;
  }

  const user = await dbService.findOneAndUpdate({
    model: User,
    filter: { _id: req.user._id },
    data: req.body,
    option: { new: true }
  });
  return successResponse({ res, data: { user } });
});

// update profile image
export const updateProfileImage = asyncHandler(async (req, res, next) => {


  const { secure_url, public_id } = await cloud.uploader.upload(req.file.path, { folder: `${process.env.APP_NAME}/user/${req.user._id}/profile` });


  const user = await dbService.findOneAndUpdate({
    model: User,
    filter: { _id: req.user._id },
    data: {
      image: { secure_url, public_id }
    },
    option: { new: false }
  });

  if (user.image?.public_id) {
    await cloud.uploader.destroy(user.image.public_id);
  }

  return successResponse({ res, data: { user } });
});


// update cover image
export const updateProfileCoverImage = asyncHandler(async (req, res, next) => {


  let images = [];

  for (const file of req.files) {
    const { secure_url, public_id } = await cloud.uploader.upload(file.path, { folder: `${process.env.APP_NAME}/user/${req.user._id}/profile/cover` });

    images.push({ secure_url, public_id });
  }
  const user = await dbService.findOneAndUpdate({
    model: User,
    filter: { _id: req.user._id },
    data: {
      coverImages: images
    },
    option: { new: true }
  });


  return successResponse({ res, data: { user } });
});

// update profile Identity
export const updateProfileIdentity = asyncHandler(async (req, res, next) => {




  return successResponse({ res, data: { file: req.files } });
});




// get profile with id
// export const shareProfile = asyncHandler(async (req, res, next) => {
//   const { profileId } = req.params;
//   let user = null;

//   if (profileId === req.user._id.toString()) {
//     return successResponse({ res, data: { user: req.user } });
//   } else {
//     user = await dbService.findOneAndUpdate({
//       model: User,
//       filter: { _id: profileId, isDeleted: { $exists: false } },
//       data: {
//         $push: { viewers: { $each: [{ userId: req.user._id, time: Date.now() }], $slice: -6 } }
//       },
//       select: "username image email viewers"
//     });
//   }

//   if (user && user.viewers.length === 6) {
//     const emailBody = `${req.user.username} has viewed your account 5 times at these time periods: ${user.viewers.slice(0, 5).map(v => new Date(v.time)).join(', ')}`;
//     await sendEmail({ to: user.email, subject: "Profile View Alert", html: `<p>${emailBody}</p>` });
//   }

//   return user ? successResponse({ res, data: { user } }) : next(new Error("In-valid account", { cause: 404 }));
// });


export const shareProfile = asyncHandler(async (req, res, next) => {
  const { profileId } = req.params;

  // If the current user is viewing their own profile, simply return it.
  if (profileId === req.user._id.toString()) {
    return successResponse({ res, data: { user: req.user } });
  }

  // First, retrieve the target user including the blockedUsers field.
  let targetUser = await dbService.findOne({
    model: User,
    filter: { _id: profileId, isDeleted: { $exists: false } },
    select: "username image email viewers blockedUsers"
  });

  if (!targetUser) {
    return next(new Error("In-valid account", { cause: 404 }));
  }

  // Check if the target user has blocked the current user.
  if (
    targetUser.blockedUsers &&
    targetUser.blockedUsers.some(bId => bId.toString() === req.user._id.toString())
  ) {
    return successResponse({ res, message: "this user blocked you" });
  }

  // If not blocked, update the viewers list.
  targetUser = await dbService.findOneAndUpdate({
    model: User,
    filter: { _id: profileId, isDeleted: { $exists: false } },
    data: {
      $push: { viewers: { $each: [{ userId: req.user._id, time: Date.now() }], $slice: -6 } }
    },
    select: "username image email viewers"
  });

  // If the viewers array reached 6 entries, send an alert email.
  if (targetUser && targetUser.viewers.length === 6) {
    const emailBody = `${req.user.username} has viewed your account 5 times at these time periods: ${targetUser.viewers.slice(0, 5).map(v => new Date(v.time)).join(', ')}`;
    await sendEmail({ to: targetUser.email, subject: "Profile View Alert", html: `<p>${emailBody}</p>` });
  }

  return targetUser
    ? successResponse({ res, data: { user: targetUser } })
    : next(new Error("In-valid account", { cause: 404 }));
});




// update email
export const updateEmail = asyncHandler(async (req, res, next) => {

  const { email } = req.body;

  if (await dbService.findOne({ model: User, filter: { email } })) {


    return next(new Error("Email Exists", { cause: 409 }));
  }



  await dbService.updateOne({ model: User, filter: { _id: req.user._id }, data: { tempEmail: email } });

  emailEvent.emit("sendConfirmEmail", { id: req.user._id, email: req.user.email });
  emailEvent.emit("updateEmail", { id: req.user._id, email });


  return successResponse({ res, data: {} });
});

// reset email
export const resetEmail = asyncHandler(async (req, res, next) => {

  const { oldCode, newCode } = req.body;

  if (
    !compareHash({ plainText: oldCode, hashValue: req.user.confirmEmailOTP })
    ||
    !compareHash({ plainText: newCode, hashValue: req.user.tempEmailOTP })

  ) {


    return next(new Error("In-valid provide codes", { cause: 400 }));
  }



  await dbService.updateOne({
    model: User,
    filter: { _id: req.user._id },
    data: {
      email: req.user.tempEmail,
      changeCredentialsTime: Date.now(),
      $unset: {
        tempEmail: 0,
        tempEmailOTP: 0,
        confirmEmailOTP: 0
      }
    }
  });




  return successResponse({ res, data: {} });
});


// update password
export const updatePassword = asyncHandler(async (req, res, next) => {

  const { oldPassword, password } = req.body;

  if (
    !compareHash({ plainText: oldPassword, hashValue: req.user.password })

  ) {


    return next(new Error("In-valid old password", { cause: 400 }));
  }



  await dbService.updateOne({
    model: User,
    filter: { _id: req.user._id },
    data: {
      password: generateHash({ plainText: password }),
      changeCredentialsTime: Date.now(),
    }
  });




  return successResponse({ res, data: {} });
});



//block user
export const blockUser = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new Error("Email is required", { cause: 400 }));
  }

  // Get the current authenticated user from the token
  const currentUser = await decodedToken({
    authorization: req.headers.authorization,
    tokenType: tokenTypes.access,
    next
  });
  if (!currentUser) return;

  // Find the user to be blocked by email
  const userToBlock = await dbService.findOne({
    model: User,
    filter: { email }
  });

  if (!userToBlock) {
    return next(new Error("User not found", { cause: 404 }));
  }

  // Prevent blocking oneself
  if (userToBlock._id.toString() === currentUser._id.toString()) {
    return next(new Error("You cannot block yourself", { cause: 400 }));
  }

  // Check if already blocked
  if (currentUser.blockedUsers && currentUser.blockedUsers.includes(userToBlock._id)) {
    return next(new Error("User already blocked", { cause: 400 }));
  }

  // Update the current user's blockedUsers list
  await dbService.updateOne({
    model: User,
    filter: { _id: currentUser._id },
    data: { $push: { blockedUsers: userToBlock._id } }
  });

  return successResponse({ res, message: "User blocked successfully" });
});



// unblock user
export const unblockUser = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new Error("Email is required", { cause: 400 }));
  }

  // Get the current authenticated user from the token
  const currentUser = await decodedToken({
    authorization: req.headers.authorization,
    tokenType: tokenTypes.access,
    next
  });
  if (!currentUser) return;

  // Find the user to be unblocked by email
  const userToUnblock = await dbService.findOne({
    model: User,
    filter: { email }
  });

  if (!userToUnblock) {
    return next(new Error("User not found", { cause: 404 }));
  }

  // Prevent unblocking oneself
  if (userToUnblock._id.toString() === currentUser._id.toString()) {
    return next(new Error("You cannot unblock yourself", { cause: 400 }));
  }

  // Check if the user is not in the blockedUsers list
  if (!currentUser.blockedUsers || !currentUser.blockedUsers.includes(userToUnblock._id)) {
    return next(new Error("User is not blocked", { cause: 400 }));
  }

  // Update the current user's blockedUsers list by removing the user's ID
  await dbService.updateOne({
    model: User,
    filter: { _id: currentUser._id },
    data: { $pull: { blockedUsers: userToUnblock._id } }
  });

  return successResponse({ res, message: "User unblocked successfully" });
});
