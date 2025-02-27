import { GraphQLObjectType, GraphQLSchema, GraphQLString } from "graphql";

import * as postGraphController from "./Post/post.graph.controller.js";
import * as userGraphController from "./User/user.graph.controller.js";




export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: "SocialAPPQuery",
    description: "main application query",
    fields: {
      ...postGraphController.query,
      ...userGraphController.query
    }
  }),
  mutation: new GraphQLObjectType({
    name: "SocialAppMutation",
    description: "main application mutation",
    fields: {
      ...postGraphController.mutation
    }
  })
});