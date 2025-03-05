import mongoose, { Schema, Types } from 'mongoose';
import { generateHash } from '../../utils/security/hash.security.js';
import { postModel } from './Post.model.js';

export const genderTypes = { male: 'male', female: 'female' };
export const providerTypes = { google: 'google', system: 'system' };
export const roleTypes = { user: 'user', admin: 'admin', superAdmin: 'superAdmin' };

const userSchema = new Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        // unique: [true, 'Username already exists'],
        lowercase: true,
        trim: true,
        minLength: [3, 'Username must be at least 3 characters long'],
        maxLength: [20, 'Username must be at most 20 characters long'],
    },
    // firstName: {
    //     type: String,
    //     required: true,
    //     // unique: [true, 'Username already exists'],
    //     lowercase: true,
    //     trim: true,
    //     minLength: [3, 'Username must be at least 3 characters long'],
    //     maxLength: [20, 'Username must be at most 20 characters long'],
    // },
    // lastName: {
    //     type: String,
    //     required: true,
    //     // unique: [true, 'Username already exists'],
    //     lowercase: true,
    //     trim: true,
    //     minLength: [3, 'Username must be at least 3 characters long'],
    //     maxLength: [20, 'Username must be at most 20 characters long'],
    // },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: [true, 'Email already exists'],
    },
    confirmEmailOTP: String,
    otpGeneratedAt: Date,
    tempEmail: String,
    tempEmailOTP: String,
    tempEmailOTPGeneratedAt: Date,
    resetPasswordOTP: String,
    resetPasswordOTPGeneratedAt: Date,
    twoStepOTP: String,
    twoStepOTPGeneratedAt: Date,
    twoStepVerification: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: (data) => {
            return data?.provider === providerTypes.google ? false : true;
        },
    },
    phone: {
        type: String,
        // required: [true, 'Phone number is required'],
        // unique :  [true, 'Phone number already exists'],
    },
    address: String,
    DOB: Date,
    image: { secure_url: String, public_id: String },
    coverImages: [{ secure_url: String, public_id: String }],
    gender: {
        type: String,
        enum: Object.values(genderTypes),
        default: genderTypes.male
    },
    role: {
        type: String,
        enum: Object.values(roleTypes),
        default: roleTypes.user
    },
    age: {
        type: Number,
        // required: [true, 'Age is required'],
        min: [18, 'Age must be at least 18 years old'],
        max: [100, 'Age must be at most 100 years old'],
    },
    isDeleted: { type: Date },
    confirmEmail: {
        type: Boolean,
        default: false
    },
    changeCredentialsTime: Date,
    provider: {
        type: String,
        enum: Object.values(providerTypes),
        default: providerTypes.system
    },
    viewers: [
        {
            userId: { type: Types.ObjectId, ref: "User" },
            time: Date
        }
    ],
    blockedUsers: [{
        type: Types.ObjectId,
        ref: "User"
    }],
    friends: [{ type: Types.ObjectId, ref: "User" }],
    updatedBy: { type: Types.ObjectId, ref: "User" }
}, {
    timestamps: true
    // , toObject: { virtuals: true },
    // toJSON: { virtuals: true }
});




userSchema.pre("save", function (next, docs) {

    console.log("pre hook 2");
    console.log({ this: this, docs });
    this.password = generateHash({ plainText: this.password });

    next();
});


userSchema.post("save", async function (docs, next) {


    console.log({ this: this, docs });

    // await postModel.deleteMany({createdBy: this._id})
    next();
});


// userSchema.virtual('username')
//     .set(function (value) {
//         console.log({ value });
//         const nameParts = value.split(" ");
//         this.firstName = nameParts[0] || "";
//         this.lastName = nameParts.slice(1).join(" ") || "";
//     })
//     .get(function () {
//         return `${this.firstName} ${this.lastName}`.trim();
//     });

export const User = mongoose.models.User || mongoose.model('User', userSchema);


export const socketConnection = new Map();
