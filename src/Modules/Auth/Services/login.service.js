import { providerTypes, roleTypes, User } from "../../../DB/models/User.model.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { successResponse } from "../../../utils/response/success.response.js";
import { generateToken, decodedToken, tokenTypes, verifyToken } from "../../../utils/security/token.security.js";
import { OAuth2Client } from 'google-auth-library';
import * as dbService from "../../../DB/db.service.js";
import { Decryption, Encryption, HashPhone } from "../../../utils/encryption.utlits.js";
import { sendEmail } from "../../../utils/email/send.email.js";
import { customAlphabet } from "nanoid";
// import { decodedToken, tokenTypes } from "../../../utils/security/token.security.js";


const failedPasswordAttemptsMap = new Map(); // map for password reset
const banDuration = 5 * 60 * 1000; // 5 minutes
const otpExpiryDuration = 2 * 60 * 1000; // 2 minutes
const maxFailedAttempts = 5;







export const LoginService = asyncHandler(async (req, res, next) => {
  const { email, phone, password } = req.body;

  // Allow login with either phone or email
  if (!phone && !email) {
    return next(new Error("Phone number or Email is required", { cause: 400 }));
  }

  let user;

  if (phone) {
    const hashedPhone = HashPhone(phone.trim());
    const users = await dbService.find({
      model: User,
      filter: { phone: hashedPhone, provider: providerTypes.system }
    });

    if (!users.length) return next(new Error("Invalid credentials", { cause: 401 }));

    if (users.length > 1 && !email) {
      return next(new Error("You have multiple accounts, please enter your email with your phone and password", { cause: 400 }));
    }

    if (users.length === 1) {
      user = users[0];
    } else {
      user = users.find(u => u.email === email);
      if (!user) return next(new Error("Invalid credentials", { cause: 401 }));
    }
  } else {
    user = await dbService.findOne({ model: User, filter: { email } });
    if (!user) return next(new Error("Invalid credentials", { cause: 401 }));
  }

  if (!user.confirmEmail) return next(new Error("Verify account first", { cause: 403 }));

  if (!compareHash({ plainText: password, hashValue: user.password })) {
    return next(new Error("Invalid credentials", { cause: 401 }));
  }

  // Two-step verification check
  if (user.twoStepVerification) {
    const otp = customAlphabet("0123456789", 6)();
    const hashOTP = generateHash({ plainText: otp });

    await dbService.updateOne({
      model: User,
      filter: { _id: user._id },
      data: { twoStepOTP: hashOTP, twoStepOTPGeneratedAt: new Date() }
    });
    await sendEmail({ to: user.email, subject: "Login Verification Code", html: `<p>Your OTP is: ${otp}</p>` });
    return successResponse({ res, message: "OTP sent to email. Confirm login." });
  }

  const isAdmin = [roleTypes.admin, roleTypes.superAdmin].includes(user.role);

  const tokens = {
    access_token: generateToken({
      payload: { id: user._id },
      signature: isAdmin ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN
    }),
    refresh_token: generateToken({
      payload: { id: user._id },
      signature: isAdmin ? process.env.ADMIN_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
      expiresIn: 31536000
    })
  };

  return successResponse({
    res,
    message: "Login successful",
    data: { token: tokens }
  });
});



export const enableTwoStepVerification = asyncHandler(async (req, res, next) => {
  const user = await decodedToken({
    authorization: req.headers.authorization,
    tokenType: tokenTypes.access,
    next
  });
  if (!user) return; // Error handled in decodedToken

  const otp = customAlphabet("0123456789", 6)();
  const hashOTP = generateHash({ plainText: otp });


  if (user.twoStepVerification){

    return next(new Error("Two-step verification is already enabled.", { cause: 409 }));
  }

  await dbService.updateOne({
    model: User,
    filter: { _id: user._id },
    data: { twoStepOTP: hashOTP, twoStepOTPGeneratedAt: new Date(), twoStepVerification: true }
  });

  await sendEmail({
    to: user.email,
    subject: "Enable Two-Step Verification",
    html: `<p>Your OTP is: ${otp}</p>`
  });

  return successResponse({ res, message: "OTP sent to email." });
});


export const disableTwoStepVerification = asyncHandler(async (req, res, next) => {
  const user = await decodedToken({
    authorization: req.headers.authorization,
    tokenType: tokenTypes.access,
    next
  });
  if (!user) return; // Error handled in decodedToken

  if (!user.twoStepVerification) {
    return next(new Error("Two-step verification is already disabled.", { cause: 409 }));
  }

  await dbService.updateOne({
    model: User,
    filter: { _id: user._id },
    data: { twoStepVerification: false, twoStepOTP: null, twoStepOTPGeneratedAt: null }
  });

  return successResponse({ res, message: "Two-step verification disabled successfully." });
});




export const verifyTwoStepVerification = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await dbService.findOne({ model: User, filter: { email } });

  if (!user || !user.twoStepOTP || !compareHash({ plainText: otp, hashValue: user.twoStepOTP })) {
    return next(new Error("Invalid OTP", { cause: 401 }));
  }

  await dbService.updateOne({
    model: User, filter: { _id: user._id }, data: {
      $unset: {
        twoStepOTP: 0
      }
      
    }
  });
  return successResponse({ res, message: "Two-step verification enabled." });
});



export const confirmLoginWithTwoStep = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const user = await dbService.findOne({ model: User, filter: { email } });

  if (!user || !user.twoStepOTP || !compareHash({ plainText: otp, hashValue: user.twoStepOTP })) {
    return next(new Error("Invalid OTP", { cause: 401 }));
  }

  await dbService.updateOne({ model: User, filter: { _id: user._id }, data: { twoStepOTP: null } });

  const isAdmin = [roleTypes.admin, roleTypes.superAdmin].includes(user.role);

  const tokens = {
    access_token: generateToken({
      payload: { id: user._id },
      signature: isAdmin ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN
    }),
    refresh_token: generateToken({
      payload: { id: user._id },
      signature: isAdmin ? process.env.ADMIN_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
      expiresIn: 31536000
    })
  };
  return successResponse({ res, message: "Login successful", data: { token: tokens } });
});





export const loginWithGmail = asyncHandler(async (req, res, next) => {
  const { idToken } = req.body;


  const client = new OAuth2Client();
  async function verify() {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.CLIENT_ID,
    });
    const payload = ticket.getPayload();
    return payload;

  }
  const payload = await verify();


  if (!payload.email_verified) {
    return next(new Error("In-valid Account", { cause: 400 }));
  }

  let user = await dbService.findOne({ model: User, filter: { email: payload.email } });

  if (!user) {
    user = await dbService.create({
      model: User,
      data: {
        username: payload.name,
        email: payload.email,
        confirmEmail: payload.email_verified,
        image: payload.picture,
        provider: providerTypes.google
      }
    });
  }


  if (user.provider !== providerTypes.google) {
    return next(new Error("In-valid provider", { cause: 400 }));
  }



  const access_token = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role) ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN
  });


  const refresh_token = generateToken({
    payload: { id: user._id },
    signature: [roleTypes.admin, roleTypes.superAdmin].includes(user.role) ? process.env.ADMIN_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000
  });


  return successResponse({
    res, status: 200, data: {
      token: {
        access_token,
        refresh_token
      }
    }
  });
});


export const refreshToken = asyncHandler(async (req, res, next) => {
  const { authorization } = req.headers;


  const user = await decodedToken({ authorization, tokenType: tokenTypes.refresh, next });

  if (user.changeCredentialsTime && user.iat * 1000 < new Date(user.passwordUpdatedAt).getTime()) {
    return next(new ErrorResponse("Invalid refresh token. Please log in again.", 401));
  }


  const access_token = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.ADMIN_ACCESS_TOKEN : process.env.USER_ACCESS_TOKEN
  });


  const refresh_token = generateToken({
    payload: { id: user._id },
    signature: user.role === roleTypes.admin ? process.env.ADMIN_REFRESH_TOKEN : process.env.USER_REFRESH_TOKEN,
    expiresIn: 31536000
  });

  return successResponse({ res, message: "done", status: 200, data: { token: { access_token, refresh_token } } });



});


export const forgotPassword = asyncHandler(async (req, res, next) => {

  const { email } = req.body;

  const user = await dbService.findOne({ model: User, filter: { email, isDeleted: { $exists: false } } });

  if (!user) {
    return next(new Error(" username not found", { cause: 404 }));
  }


  if (!user.confirmEmail) {
    return next(new Error(" Verify your Account First", { cause: 400 }));
  }

  emailEvent.emit("forgotPassword", { id: user._id, email });

  return successResponse({ res });


});


// export const validateForgotPassword = asyncHandler(async (req, res, next) => {

//   const { email, code } = req.body;

//   const user = await dbService.findOne({ model: User, filter: { email, isDeleted: false } });

//   if (!user) {
//     return next(new Error(" username not found", { cause: 404 }));
//   }


//   if (!user.confirmEmail) {
//     return next(new Error(" Verify your Account First", { cause: 400 }));
//   }


//   if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
//     return next(new Error(" In-valid reset code", { cause: 400 }));
//   }



//   return successResponse({ res });


// });




export const validateForgotPassword = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;
  const user = await dbService.findOne({ model: User, filter: { email, isDeleted: { $exists: false } } });

  if (!user) return next(new Error("Account not found", { cause: 404 }));
  if (!user.confirmEmail) return next(new Error("Verify your account first", { cause: 400 }));

  const now = Date.now();
  let storedAttempts = failedPasswordAttemptsMap.get(email) || { attempts: 0, bannedUntil: null };

  // Clear expired ban
  if (storedAttempts.bannedUntil && now >= storedAttempts.bannedUntil) {
    failedPasswordAttemptsMap.delete(email);
    storedAttempts = { attempts: 0, bannedUntil: null };
  }

  // Check active ban
  if (storedAttempts.bannedUntil && now < storedAttempts.bannedUntil) {
    const remaining = Math.ceil((storedAttempts.bannedUntil - now) / 60000);
    return next(new Error(`Temporarily banned. Try again in ${remaining} minute(s)`, { cause: 429 }));
  }

  // Convert to timestamp
  const otpGenerationTime = user.resetPasswordOTPGeneratedAt instanceof Date
    ? user.resetPasswordOTPGeneratedAt.getTime()
    : Number(user.resetPasswordOTPGeneratedAt) || 0;

  // OTP expiration check
  const isOtpExpired = now > otpGenerationTime + otpExpiryDuration;

  if (!user.resetPasswordOTP || isOtpExpired) {
    // Auto-generate and send new password reset OTP
    emailEvent.emit("forgotPassword", {
      id: user._id,
      email
    });

    return next(new Error("New password reset OTP sent - previous code expired", {
      cause: 400,
      metadata: { newOtpSent: true }
    }));
  }

  // Validate OTP
  if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
    const newAttempts = storedAttempts.attempts + 1;

    if (newAttempts >= maxFailedAttempts) {
      failedPasswordAttemptsMap.set(email, {
        attempts: newAttempts,
        bannedUntil: now + banDuration
      });
      return next(new Error("Too many failed attempts. Banned for 5 minutes.", { cause: 429 }));
    }

    failedPasswordAttemptsMap.set(email, {
      attempts: newAttempts,
      bannedUntil: null
    });
    return next(new Error("Invalid password reset code", { cause: 400 }));
  }

  // Successful verification
  failedPasswordAttemptsMap.delete(email);
  await dbService.updateOne({
    model: User,
    filter: { email },
    data: {
      $unset: {
        resetPasswordOTPGeneratedAt: 0
      },

    }
  });

  return successResponse({ res, message: "Verification successful", status: 200 });
});



// Reset Password
export const resetPassword = asyncHandler(async (req, res, next) => {

  const { email, code, password } = req.body;

  const user = await dbService.findOne({ model: User, filter: { email, isDeleted: { $exists: false } } });

  if (!user) {
    return next(new Error(" username not found", { cause: 404 }));
  }


  if (!user.confirmEmail) {
    return next(new Error(" Verify your Account First", { cause: 400 }));
  }


  if (!compareHash({ plainText: code, hashValue: user.resetPasswordOTP })) {
    return next(new Error(" In-valid reset code", { cause: 400 }));
  }


  await dbService.updateOne({
    model: User,
    filter: { email },
    data: {

      password: generateHash({ plainText: password }),
      changeCredentialsTime: Date.now(),
      $unset: {
        resetPasswordOTP: 0
      }
    }
  });

  return successResponse({ res });


});



