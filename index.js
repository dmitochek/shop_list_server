const { DateTimeResolver, DateTimeTypeDefinition } = require('graphql-scalars');
const { ApolloServer, gql } = require('apollo-server');
const { MongoClient } = require('mongodb');
const User = require('./data-source/User.js').default;
const Lists = require('./data-source/Lists.js').default;
const Products = require('./data-source/Products.js').default;

const client = new MongoClient('mongodb://localhost:27017/shopDB');
client.connect();

const typeDefs = gql`
  type User {
    _id: ID 
    google_id: String!
    category_order: [Int!]
  }

  type List {
    _id: ID
    name: String!
    size: Int
    completed: Int
    date: String
    list: [Item]
  }

  type Item {
    quanity: Float!
    note: String
    unit: Int!
    category: Int!
    checked: Boolean!
  }

  type Product {
    name: String!
    category: Int!
    unit: Int!
    diff_step: Int!
    raiting: Int!
  }

  type Query {
    getuser(token: String!): User
    getlists(token: String!): [List]
    getpopularproducts(token: String!): [Product]
    getlistproducts(token: String!, listname: String!): [Product]
    getproduct(token: String!, listname: String!, product: String!): Item
    searchproducts(token: String!, name: String!): [Product]
  }
  
  type Mutation {
    verifyuser(token: String!): Boolean
    renamelist(token: String!, _id: String!, newname: String!): Boolean
    sharelist(token: String!, _id: String!, newemail: String!): Boolean
    copylist(token: String!, _id: String!, newlistname: String!): Boolean
    removelist(token: String!, _id: String!): Boolean
    createnewlist(token: String!, newname: String!): Boolean
    editproduct(token: String!, listname: String!, product: String!, newcategory: Int!, newunit: Int!, newnote: String, newquanity: Float!): Boolean
  }
`;

const resolvers = {
  Query:
  {
    getuser: (parent, args, context) => context.dataSources.users.getUser(args.token),
    getlists: (parent, args, context) => context.dataSources.lists.getLists(args.token),
    getpopularproducts: (parent, args, context) => context.dataSources.products.getPopular(args.token),
    getlistproducts: (parent, args, context) => context.dataSources.products.getlistitems(args.token, args.listname),
    getproduct: (parent, args, context) => context.dataSources.lists.getProduct(args.token, args.listname, args.product),
    searchproducts: (parent, args, context) => context.dataSources.products.searchitems(args.token, args.name),
  },
  Mutation:
  {
    verifyuser: (parent, args, context) => context.dataSources.users.tokenCheck(args.token),
    renamelist: (parent, args, context) => context.dataSources.lists.renameList(args.token, args._id, args.newname),
    sharelist: (parent, args, context) => context.dataSources.lists.shareList(args.token, args._id, args.newemail),
    copylist: (parent, args, context) => context.dataSources.lists.copyList(args.token, args._id, args.newlistname),
    removelist: (parent, args, context) => context.dataSources.lists.removeList(args.token, args._id),
    createnewlist: (parent, args, context) => context.dataSources.lists.createList(args.token, args.newname),
    editproduct: (parent, args, context) => context.dataSources.lists.editProduct(args.token, args.listname,
      args.product, args.newcategory, args.newunit, args.newnote, args.newquanity),
  }
};

const server = new ApolloServer({
  typeDefs: typeDefs,
  resolvers: resolvers,
  dataSources: () => ({
    users: new User(client.db("shopDB").collection("users")),
    lists: new Lists(client.db("shopDB").collection("lists")),
    products: new Products(client.db("shopDB").collection("products")),
  }),
  plugins: [
    {
      async serverWillStart()
      {
        new Lists(client.db("shopDB").collection("lists")).updateDBpopular();
        setInterval(() => new Lists(client.db("shopDB").collection("lists")).updateDBpopular(), 60 * 60 * 1000);
      }
    }
  ]
});

server.listen().then(({ url }) =>
{
  console.log(`🚀  Server ready at ${url}`);
});
