

import mongoose, { Schema, Types, model } from "mongoose";
import { commentModel } from "./Comment.model.js";


const postSchema = new Schema({
  content: {
    type: String, minlength: 2,
    maxlength: 50000,
    trim: true,
    required: function () {
      console.log(this);
      return this.attachments?.length ? false : true;
    }
  },

  attachments: [{ secure_url: String, public_id: String }],
  likes: [{ type: Types.ObjectId, ref: "User" }],
  // comments: [{ type: Types.ObjectId, ref: "Comment" }],
  tags: [{ type: Types.ObjectId, ref: "User" }],
  createdBy: { type: Types.ObjectId, ref: "User", required: true },
  updatedBy: { type: Types.ObjectId, ref: "User" },
  deletedBy: { type: Types.ObjectId, ref: "User" },
  isDeleted: Date,
  archivedAt: { type: Date },


}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


postSchema.virtual("comments", {
  localField: "_id",
  foreignField: "postId",
  ref: "Comment",
  // justOne: true
});


// Hook to soft delete all related comments when a post is soft deleted
postSchema.post("findOneAndUpdate", async function (doc) {
  if (doc && doc.isDeleted) {
    await commentModel.updateMany(
      { postId: doc._id, isDeleted: { $exists: false } },
      { isDeleted: new Date(), deletedBy: doc.deletedBy }
    );
  }
});

export const postModel = mongoose.models.Post || model("Post", postSchema);