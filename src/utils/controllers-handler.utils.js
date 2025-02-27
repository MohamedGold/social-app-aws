import authController from "../Modules/Auth/auth.controller.js";
import chatController from "../Modules/Chat/chat.controller.js";
import postController from "../Modules/Post/post.controller.js";
import userController from "../Modules/User/user.controller.js";




export function controllerHandler(app) {
    app.use('/auth', authController);

    app.use('/user', userController);

    app.use('/post', postController);


    app.use('/chat', chatController);


    app.all("*", (req, res, next) => {
        return res.status(404).json({ message: "In-valid Routing Request" });
    });



}


