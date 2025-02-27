import { asyncHandler } from "../../../utils/response/error.response.js";
import * as dbService from "../../../DB/db.service.js";
import { chatModel } from "../../../DB/models/Chat.model.js";
import { successResponse } from "../../../utils/response/success.response.js";

export const getChat = asyncHandler(async (req, res, next) => {


  const { friendId } = req.params;

  const chat = await dbService.findOne({
    model: chatModel,
    filter: {
      $or: [
        {
          mainUser: req.user._id,
          subParticipant: friendId
        },
        {
          mainUser: friendId,
          subParticipant: req.user._id
        },
      ],
    },
    populate: [
      {
        path: "mainUser",
        select: "username image"
      },
      {
        path: "subParticipant",
        select: "username image"
      },
      {
        path: "messages.senderId",
        select: "username image"
      },
    ]
  });


  return successResponse({ res, data: { chat } });
});
