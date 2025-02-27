import express from "express";
import path from "node:path";

import { config } from "dotenv";
config();

import { controllerHandler } from "./utils/controllers-handler.utils.js";
import { database_connect } from "./DB/connection.js";
import { globalErrorHandling } from "./utils/response/error.response.js";
import cors from "cors";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { createHandler } from "graphql-http/lib/use/express";
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";
import { schema } from "./Modules/app.graph.js";
import { authentication } from "./Middleware/Socket/auth.socket.middleware.js";
import { socketConnection, User } from "./DB/models/User.model.js";
import { runIo } from "./Modules/Socket/socket.controller.js";



const authLimiter = rateLimit({
  limit: 60,
  windowMs: 2 * 60 * 1000,
  message: { error: "You Have Reached Rate limit " },
  legacyHeaders: true,
  standardHeaders: "draft-8"
});

const postLimiter = rateLimit({
  limit: 30,
  windowMs: 2 * 60 * 1000,
  message: { error: "You Have Reached Rate limit " },
  legacyHeaders: true,
  standardHeaders: "draft-8",
  
});


async function bootstrap() {

  const app = express();


  // let whitelist = process.env.WHITELIST.split(",") || [];
  // console.log(whitelist);
  // let corsOptions = {
  //     origin: function (origin, callback) {
  //         if (whitelist.indexOf(origin) !== -1) {
  //             callback(null, true);
  //         } else {
  //             callback(new Error('Not allowed by CORS'));
  //         }
  //     }
  // };




  app.use("/graphql", createHandler({ schema: schema }));


  app.use(cors());

  app.use(helmet());
  app.use("/auth", authLimiter);
  app.use("/post", postLimiter);


  app.set('trust proxy', 1); 
  // async function test() {
  //     const user = await User.insertMany([
  //         {
  //         username: "glowddadsstest",
  //         email: `${Date.now()}dsad@gmail.com`,
  //         password: "ewfwe",
  //         phone: "012232343",
  //         age: 22
  //     },
  //         {
  //             username: "glowddadsstest",
  //             email: `${Date.now()}dsad444@gmail.com`,
  //             password: "ewfwe",
  //             phone: "012232343",
  //             age: 22
  //         }
  // ]);


  // }

  // test();



  app.get("/", async(req, res, next) => {

    
    res.status(200).json({message: "Social App Server is running"})
  });




  app.use("/uploads", express.static(path.resolve("./src/uploads")));

  app.use(express.json());

  controllerHandler(app);


  database_connect();
  app.use(globalErrorHandling);


  const httpServer = app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
  });


  runIo(httpServer);





}

export default bootstrap;