import { Router } from "express";
import { authentication, authorization } from "../../Middleware/auth.middleware.js";
import * as profileService from "./service/user.service.js";
import * as validators from "./user.validation.js";
import { validation } from "../../Middleware/validation.middleware.js";
import { fileValidations, uploadFileDisk } from "../../utils/multer/local.multer.js";
import { uploadCloudFile } from "../../utils/multer/cloud.multer.js";
import { endPoint } from "./user.authorization.js";
const userController = Router();


// add friend request
userController.patch("/profile/friends/:friendId", authentication(), profileService.sendFriendRequest);


// accept friend request
userController.patch("/profile/friends/:friendRequestId/accept", authentication(), profileService.acceptFriendRequest);

// get profile with token
userController.get("/profile", authentication(), profileService.profile);


// get Dashboard
userController.get("/profile/dashboard", authentication(), authorization(endPoint.changeRoles), profileService.dashboard);


// change role
userController.patch("/:userId/profile/change-role", authentication(), authorization(endPoint.changeRoles), profileService.changeRoles);


// get profile with id
userController.get("/profile/:profileId", validation(validators.shareProfile), authentication(), profileService.shareProfile);

// update email
userController.patch("/profile/email", validation(validators.updateEmail), authentication(), profileService.updateEmail);

// reset email address
userController.patch("/profile/reset-email", validation(validators.resetEmail), authentication(), profileService.resetEmail);

// update password
userController.patch("/profile/update-password", validation(validators.updatePassword), authentication(), profileService.updatePassword);

// update profile
userController.patch("/profile/update-profile", validation(validators.updateProfile), authentication(), profileService.updateProfile);

// update profile image
userController.patch("/profile/update-image",
  authentication(),
  uploadCloudFile(fileValidations.image).single("attachment"),
  validation(validators.profileImage),
  profileService.updateProfileImage);



// update profile cover image
userController.patch("/profile/update-cover-image",
  authentication(),
  uploadCloudFile(fileValidations.image).array("attachment", 3),
  profileService.updateProfileCoverImage);


// update identity
userController.patch("/profile/update-identity",
  authentication(),
  uploadFileDisk("user/profile", [...fileValidations.document, ...fileValidations.image]).fields([
    { name: "image", maxCount: 1 },
    { name: "data", maxCount: 2 },
  ]),

  profileService.updateProfileIdentity);


// Block User endpoint
userController.patch('/block-user', profileService.blockUser);
userController.patch('/unblock-user', profileService.unblockUser);






export default userController;