import { GraphQLNonNull, GraphQLString } from "graphql";
import { getProfile } from "./service/user.graph.query.js";
import { getProfileResponse } from "./types/user.types.js";




export const query = {

  getProfile: {
    type: getProfileResponse,
    args: {
      authorization: { type: new GraphQLNonNull(GraphQLString) }
    },
    resolve: getProfile
  }
};