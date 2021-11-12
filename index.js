const { ApolloServer, gql } = require('apollo-server');
const { MongoClient } = require('mongodb');
const User = require('./data-source/User.js').default;

const client = new MongoClient('mongodb://localhost:27017/shopDB');
client.connect();

const typeDefs = gql`
  type User {
    _id: ID 
    login: String!
    friends: [User]
    lists: [List]
  }

  type List{
    name: String!
    list: [String!]
  }

  type Query {
    getuser(_id: ID!): User
  }

  type Mutation {
    deletelist(_id: ID!, name: String!): Boolean
    rename(_id: ID!, name: String!, newname: String!): Boolean
    addnewlist(_id: ID!, name: String!): Boolean
  }

`;
const resolvers = {
  Query:
  {
    getuser: (parent, args, context) => context.dataSources.users.getUser(args._id)
  },
  Mutation:
  {
    deletelist: (parent, args, context) => context.dataSources.users.changeUser(args._id, args.name),
    rename: (parent, args, context) => context.dataSources.users.renameList(args._id, args.name, args.newname),
    addnewlist: (parent, args, context) => context.dataSources.users.addNewListName(args._id, args.name),
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
  dataSources: () => ({
    users: new User(client.db("shopDB").collection("users")),
  })
});

server.listen().then(({ url }) =>
{
  console.log(`🚀  Server ready at ${url}`);
});
