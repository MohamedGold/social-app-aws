import * as chatService from "./service/chat.service.js";
import { Router } from "express";
import { authentication } from "../../Middleware/auth.middleware.js";

const chatController = Router();


chatController.get("/:friendId", authentication(), chatService.getChat);



export default chatController;