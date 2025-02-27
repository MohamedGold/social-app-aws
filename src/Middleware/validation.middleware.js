
import joi from "joi";
import { Types } from "mongoose";
import { genderTypes } from "../DB/models/User.model.js";

export const isValidObjectId = (value, helper) => {

  return Types.ObjectId.isValid(value) ? true : helper.message("In-valid object  ID");
};



const fileObj = {

  fieldname: joi.string().valid("attachment"),
  originalname: joi.string(),
  encoding: joi.string(),
  mimetype: joi.string(),
  finalPath: joi.string(),
  destination: joi.string(),
  filename: joi.string(),
  path: joi.string(),
  size: joi.number()

};

export const generalFields = {
  username: joi.string().min(3).max(20).trim(),
  email: joi.string().email({ minDomainSegments: 2, maxDomainSegments: 3, tlds: { allow: ['com', 'net'] } }),
  password: joi.string().pattern(new RegExp(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)),
  confirmPassword: joi.string(),
  phone: joi.string(),
  age: joi.number().min(18).max(100),
  code: joi.string().pattern(new RegExp(/^\d{4}$/)),
  otp: joi.string().pattern(new RegExp(/^\d{6}$/)),
  id: joi.string().custom(isValidObjectId),
  DOB: joi.date().less("now"),
  gender: joi.string().valid(...Object.values(genderTypes)),
  address: joi.string(),
  phone: joi.string().pattern(new RegExp(/^(002|\+2)?01[0125][0-9]{8}$/)),
  fileObj,
  file: joi.object().keys(fileObj).required()
};





export const validation = (Schema) => {
  return (req, res, next) => {
    const inputs = { ...req.query, ...req.body, ...req.params };

    if (req.file || req.files?.length) {
      inputs.file = req.file || req.files;
    }

    console.log({ inputs });

    const validationResult = Schema.validate(inputs, { abortEarly: false });
    if (validationResult.error) {
      return res.status(400).json({ message: "validation error", details: validationResult.error.details });
    }

    return next();
  };
};