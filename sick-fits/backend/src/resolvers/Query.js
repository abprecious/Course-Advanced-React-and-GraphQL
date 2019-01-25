const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");

const Query = {
  //if query is same as in schema use this shortcut then write custom queries
  items: forwardTo("db"),
  item: forwardTo("db"),
  itemsConnection: forwardTo("db"),
  me: function(parents, args, ctx, info) {
    //check if there is a current userId
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId }
      },
      info
    );
  },
  async users(parents, args, ctx, info) {
    //check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in!");
    }
    //check if the user has the permissions to query all of the users
    hasPermission(ctx.request.user, ["ADMIN", "PERMISSIONUPDATE"]);
    //if they do, query all users
    return ctx.db.query.users({}, info);
  }
};

module.exports = Query;
