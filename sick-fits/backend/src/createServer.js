// Import GraphQL Yoga Server (Express Middleware)
const { GraphQLServer } = require('graphql-yoga');
const Mutation = require('./resolvers/Mutation');
const Query = require('./resolvers/Query');
const db = require('./db');

//Create the GraphQL Yoya Server

function createServer() {
  return new GraphQLServer({
    typeDefs: 'src/scheme.graphql',
    resolvers: {
      Mutation,
      Query
    },
    resolverValidationOptions: {
      requireResolversForResolveType: false,
    },
    context: req => ({ ...req, db }),
  });
}

module.exports = createServer;
