import joi from 'joi';
import { generalFields } from '../../Middleware/validation.middleware.js';


export const signup = joi.object().keys({
  username: generalFields.username.required(),
  email: generalFields.email.required(),
  password: generalFields.password.required(),
  confirmPassword: generalFields.confirmPassword.valid(joi.ref("password")).required(),
  phone: generalFields.phone.required(),
  age: generalFields.age.required()
}).required();



export const confirmEmail = joi.object().keys({
  email: generalFields.email.required(),
  code: generalFields.code.required()

}).required();



export const validateForgotPassword = confirmEmail;

export const verifyTwoStep = joi.object().keys({
  email: generalFields.email.required(),
  otp: generalFields.otp.required()
});

export const confirmLoginWithTwoStep = verifyTwoStep


export const login = joi.object().keys({
  email: generalFields.email,
  phone: generalFields.phone,
  password: generalFields.password.required(),

}).or('email', 'phone')  // Requires either email or phone but not both
  .messages({
    'object.or': 'You must provide either email or phone, but not both'
  });


export const forgotPassword = joi.object().keys({
  email: generalFields.email.required(),

}).required();


export const resetPassword = joi.object().keys({
  code: generalFields.code.required(),
  email: generalFields.email.required(),
  newPassword: generalFields.password.required(),
  confirmPassword: generalFields.confirmPassword.valid(joi.ref("newPassword")).required()

}).required();
