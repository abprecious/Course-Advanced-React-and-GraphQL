const { forwardTo } = require("prisma-binding");

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
  }
};

module.exports = Query;
