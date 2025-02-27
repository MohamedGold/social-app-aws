import { authentication } from "../../../Middleware/graph/auth.graph.middleware.js";



export const getProfile = async (parent, args) => {

  const { authorization } = args;


  const user = await authentication({ authorization });

  return { message: "Done", statusCode: 200, data: user };
};