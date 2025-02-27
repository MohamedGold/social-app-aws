import { GraphQLBoolean, GraphQLEnumType, GraphQLID, GraphQLInt, GraphQLList, GraphQLObjectType, GraphQLString } from "graphql";
import { imageType } from "../../../utils/app.types.shared.js";



export const oneUserType = {
  _id: { type: GraphQLID },
  username: { type: GraphQLString },
  email: { type: GraphQLString },
  password: { type: GraphQLString },
  image: { type: imageType },
  confirmEmailOTP: { type: GraphQLString },
  tempEmail: { type: GraphQLString },
  tempEmailOTP: { type: GraphQLString },
  resetPasswordOTP: { type: GraphQLString },
  phone: { type: GraphQLString },
  address: { type: GraphQLString },
  DOB: { type: GraphQLString },
  coverImages: { type: new GraphQLList(imageType) },
  gender: {
    type: new GraphQLEnumType({
      name: "genderTypes",
      values: {
        male: { type: GraphQLString },
        female: { type: GraphQLString },
      }
    })
  },
  role: {
    type: new GraphQLEnumType({
      name: "roleTypes",
      values: {
        admin: { type: GraphQLString },
        superAdmin: { type: GraphQLString },
        user: { type: GraphQLString },
      }
    })
  },

  provider: {
    type: new GraphQLEnumType({
      name: "providerTypes",
      values: {
        system: { type: GraphQLString },
        google: { type: GraphQLString },
      }
    })
  },
  confirmEmail: { type: GraphQLBoolean },
  isDeleted: { type: GraphQLString },
  changeCredentialsTime: { type: GraphQLString },
  age: { type: GraphQLInt },
};



// ================================

export const oneUserResponse = new GraphQLObjectType({
  name: "oneUserResponse",
  fields: {

    ...oneUserType,
    viewers: {
      type: new GraphQLList(
        new GraphQLObjectType({
          name: "viewersList",
          fields: {
            ...oneUserType
          }
        }))
    },
    updatedBy: { type: GraphQLID }

  }
});






// ================================



export const getProfileResponse = new GraphQLObjectType({
  name: "getProfileResponse",
  fields: {
    message: {type: GraphQLString},
    statusCode: {type: GraphQLInt},
    data: {type: oneUserResponse}
  }
});
