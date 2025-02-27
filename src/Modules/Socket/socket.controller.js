
import { Server } from "socket.io";
import { logOutSocketId, registerSocket } from "./service/auth.service.js";
import { sendMessage } from "./service/message.service.js";




let io = undefined;



export const runIo = (httpServer) => {

  io = new Server(httpServer, { cors: "*" });



  return io.on("connection", async (socket) => {

    await registerSocket(socket);
    await sendMessage(socket);
    await logOutSocketId(socket);

  });
};


export const getIo = () => {
  return io;
};