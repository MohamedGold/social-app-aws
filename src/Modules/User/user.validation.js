import joi from "joi";
import { generalFields } from "../../Middleware/validation.middleware.js";


export const shareProfile = joi.object().keys({
  profileId: generalFields.id.required()
}).required();



export const profileImage = joi.object().keys({

  file: generalFields.file.required()

}).required();

export const updateEmail = joi.object().keys({
  email: generalFields.email.required()
}).required();



export const resetEmail = joi.object().keys({
  oldCode: generalFields.code.required(),
  newCode: generalFields.code.required()
}).required();


export const updatePassword = joi.object().keys({
  oldPassword: generalFields.password.required(),
  password: generalFields.password.not(joi.ref("oldPassword")).required(),
  confirmPassword: generalFields.confirmPassword.valid(joi.ref("password")).required(),
}).required();


export const updateProfile = joi.object().keys({
  username: generalFields.username,
  DOB: generalFields.DOB,
  gender: generalFields.gender,
  phone: generalFields.phone,
  address: generalFields.address,
}).required();