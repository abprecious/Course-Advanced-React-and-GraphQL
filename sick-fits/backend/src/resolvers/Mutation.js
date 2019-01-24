const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const Mutations = {
  async createItem(parent, args, ctx, info) {
    //TODO: Check if they are logged in

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          ...args
        }
      },
      info
    );

    return item;
  },
  updateItem(parent, args, ctx, info) {
    //first take a copy of the updates
    const updates = { ...args };
    //remove the ID from the updates
    delete updates.id;
    //run the update method
    return ctx.db.mutation.updateItem(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },
  async deleteItem(parent, args, ctx, info) {
    const where = { id: args.id };
    //1. find item
    const item = await ctx.db.query.item({ where }, `{id, title}`);
    //2. Check if they own that item or have the permissions
    //TODO
    //3. Delete it!
    return ctx.db.mutation.deleteItem({ where }, info);
  },
  async signup(parent, args, ctx, info) {
    // lowercase email
    args.email = args.email.toLowerCase();
    // hash their password - one way
    //adding the salt length of 10 helps make hash unique
    const password = await bcrypt.hash(args.password, 10);
    //create user in the DB
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password,
          permissions: { set: ["USER"] }
        }
      },
      info
    );
    //create JWT once created
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    //we set the JWT as a cookie on the response
    ctx.response.cookie("token", token, {
      //can't access via JS or bad extensions etc
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 //1 year cookie
    });
    //finally we return the user to the browser
    return user;
  },
  async signin(parent, { email, password }, ctx, info) {
    //check if there is a user with that email
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      //up in the air if you should return that no email exists for said provided email
      throw new Error(`No such user found for email ${email}`);
    }
    //check if their password is correct
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error("Invalid Password");
    }
    //generate JWT token
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    //set cookie with token
    ctx.response.cookie("token", token, {
      //can't access via JS or bad extensions etc
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 //1 year cookie
    });
    //return the user
    return user;
  },
  signout(parents, args, ctx, info) {
    ctx.response.clearCookie("token");
    return { message: "Goodbye!" };
  }
};

module.exports = Mutations;
