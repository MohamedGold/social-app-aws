import { compareSync, hashSync } from "bcrypt";
import { User } from "../../../DB/models/User.model.js";
import { Encryption, HashPhone } from "../../../utils/encryption.utlits.js";
import { asyncHandler } from "../../../utils/response/error.response.js";
import { compareHash, generateHash } from "../../../utils/security/hash.security.js";
import { emailEvent } from "../../../utils/events/email.event.js";
import { successResponse } from "../../../utils/response/success.response.js";
import * as dbService from '../../../DB/db.service.js';



const failedAttemptsMap = new Map();
const banDuration = 5 * 60 * 1000;
const otpExpiryDuration = 2 * 60 * 1000;
const maxFailedAttempts = 5;




// export const SignUpService = asyncHandler(async (req, res, next) => {

//     const { username, email, password, age, phone } = req.body;


//     if (await dbService.findOne({ model: User, filter: { email } })) {
//         return next(new Error("Email Exist", { cause: 409 }));
//     }



//     const user = await dbService.create({
//         model: User,
//         data: {
//             username,
//             email,
//             password,
//             age,
//             phone,
//         },

//     });

//     emailEvent.emit("sendConfirmEmail", { id: user._id, email });

//     return successResponse({ res, message: "signup successful", status: 201, data: { user } });
// });




// export const ConfirmEmailService = asyncHandler(async (req, res, next) => {
//     const { email, code } = req.body;

//     const user = await dbService.findOne({ model: User, filter: { email } });


//     if (!user) {
//         return next(new Error("In-valid Account", { cause: 404 }));
//     }


//     if (user.confirmEmail) {
//         return next(new Error("Already Verified", { cause: 409 }));
//     }


//     if (!compareHash({ plainText: code, hashValue: user.confirmEmailOTP })) {
//         return next(new Error("In-valid code", { cause: 400 }));
//     }

//     await dbService.updateOne({ model: User, filter: { email }, data: { confirmEmail: true, $unset: { confirmEmailOTP: 0 } } });

//     return successResponse({ res, message: " OTP done", status: 200, data: user });
// });



export const SignUpService = asyncHandler(async (req, res, next) => {
    const { username, email, password, age, phone } = req.body;

    if (await dbService.findOne({ model: User, filter: { email } })) {
        return next(new Error("Email exists", { cause: 409 }));
    }

    const hashedPhone = HashPhone(phone);

    const user = await dbService.create({
        model: User,
        data: {
            username,
            email,
            password,
            age,
            phone: hashedPhone,
        }
    });

    emailEvent.emit("sendConfirmEmail", { id: user._id, email });
    return successResponse({ res, message: "Signup successful", data: user, status: 201 });
});


export const ConfirmEmailService = asyncHandler(async (req, res, next) => {
    const { email, code } = req.body;
    const user = await dbService.findOne({ model: User, filter: { email } });

    if (!user) return next(new Error("Account not found", { cause: 404 }));
    if (user.confirmEmail) return next(new Error("Already verified", { cause: 409 }));

    const now = Date.now();
    let storedAttempts = failedAttemptsMap.get(email) || { attempts: 0, bannedUntil: null };

    if (storedAttempts.bannedUntil && now >= storedAttempts.bannedUntil) {
        failedAttemptsMap.delete(email);
        storedAttempts = { attempts: 0, bannedUntil: null };
    }

    if (storedAttempts.bannedUntil && now < storedAttempts.bannedUntil) {
        const remaining = Math.ceil((storedAttempts.bannedUntil - now) / 60000);
        return next(new Error(`Temporarily banned. Try again in ${remaining} minute(s)`, { cause: 429 }));
    }

    const otpGenerationTime = user.otpGeneratedAt instanceof Date
        ? user.otpGeneratedAt.getTime()
        : Number(user.otpGeneratedAt) || 0;

    const isOtpExpired = now > otpGenerationTime + otpExpiryDuration;

    if (!user.confirmEmailOTP || isOtpExpired) {
        // Auto-generate and send new OTP
        emailEvent.emit("sendConfirmEmail", {
            id: user._id,
            email
        });

        return next(new Error("New OTP sent - previous code expired", {
            cause: 400,
            metadata: { newOtpSent: true }
        }));
    }

    if (!compareHash({ plainText: code, hashValue: user.confirmEmailOTP })) {
        const newAttempts = storedAttempts.attempts + 1;

        if (newAttempts >= maxFailedAttempts) {
            failedAttemptsMap.set(email, {
                attempts: newAttempts,
                bannedUntil: now + banDuration
            });
            return next(new Error("Too many failed attempts. Banned for 5 minutes.", { cause: 429 }));
        }

        failedAttemptsMap.set(email, {
            attempts: newAttempts,
            bannedUntil: null
        });
        return next(new Error("Invalid verification code", { cause: 400 }));
    }

    failedAttemptsMap.delete(email);
    await dbService.updateOne({
        model: User,
        filter: { email },
        data: {
            confirmEmail: true,
            $unset: {
                confirmEmailOTP: 0,
                otpGeneratedAt: 0
            }
        }
    });
    return successResponse({ res, message: "Verification successful", status: 200, data: user });
});








