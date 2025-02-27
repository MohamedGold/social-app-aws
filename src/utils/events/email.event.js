import { EventEmitter } from "node:events";
import { customAlphabet } from "nanoid";
import { generateHash } from "../security/hash.security.js";
import { User } from "../../DB/models/User.model.js";
import { sendEmail } from "../email/send.email.js";
import { verifyAccountTemplate } from "../email/template/verifyAccount.template.js";
export const emailEvent = new EventEmitter();
import * as dbService from "../../DB/db.service.js";

export const emailSubject = {
  confirmEmail: "Confirm-Email",
  resetPassword: "Reset-Password",
  updateEmail: "updateEmail"
};



export const sendCode = async ({ data = {}, subject = emailSubject.confirmEmail } = {}) => {

  const { id, email } = data;
  const otp = customAlphabet("0123456789", 4)();
  const hashOTP = generateHash({ plainText: otp });


  let updateData = {};
  const now = new Date();

  switch (subject) {
    case emailSubject.confirmEmail:
      updateData = {
        confirmEmailOTP: hashOTP,
        otpGeneratedAt: now // for email confirmation OTP
      };
      break;


    case emailSubject.resetPassword:
      updateData = {
        resetPasswordOTP: hashOTP,
        resetPasswordOTPGeneratedAt: now //  for password reset OTP
      };
      break;

    case emailSubject.updateEmail:
      updateData = {
        tempEmailOTP: hashOTP,
        tempEmailOTPGeneratedAt: now //  for email update OTP
      };
      break;

    default:
      break;
  }



  await dbService.updateOne({ model: User, filter: { _id: id }, data: updateData });

  const html = verifyAccountTemplate({ code: otp });

  await sendEmail({ to: email, subject, html });
};




emailEvent.on("sendConfirmEmail", async (data) => {
  await sendCode({ data });
});


emailEvent.on("updateEmail", async (data) => {
  await sendCode({ data, subject: emailSubject.updateEmail });
});;

emailEvent.on("forgotPassword", async (data) => {
  await sendCode({ data, subject: emailSubject.resetPassword });
});