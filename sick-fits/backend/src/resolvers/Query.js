const { forwardTo } = require("prisma-binding");

const Query = {
  //if query is same as in schema use this shortcut then write custom queries
  items: forwardTo("db"),
  item: forwardTo("db")
  // async items(parent, args, ctx, info) {
  //   const items = await ctx.db.query.items();
  //   return items;
  // },
};

module.exports = Query;
