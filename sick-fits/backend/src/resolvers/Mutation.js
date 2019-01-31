const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");

const { hasPermission } = require("../utils");
const { transport, makeANiceEmail } = require("../mail");
const stripe = require("../stripe");

const Mutations = {
  async createItem(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to create an item!");
    }

    const item = await ctx.db.mutation.createItem(
      {
        data: {
          // this is how we create relationships in data
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
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
    if (!ctx.request.userId) {
      throw new Error("You must be logged in to delete an item!");
    }
    const where = { id: args.id };
    //1. find item
    const item = await ctx.db.query.item({ where }, `{id title user{ id }}`);
    //2. Check if they own that item or have the permissions
    const ownsItem = item.user.id === ctx.request.userId;
    const hasPermissions = ctx.request.user.permissions.some(permission =>
      ["ADMIN", "ITEMDELETE"].includes(permission)
    );
    if (!ownsItem && hasPermissions) {
      throw new Error("You do not have permission to delete items");
    }
    // 3. Delete it!
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
  },
  async requestReset(parents, { email }, ctx, info) {
    //check if this is a real user
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for email ${email}`);
    }
    //set a reset token and expiry on that user
    const randomBytesPromiseified = promisify(randomBytes);
    const resetToken = (await randomBytesPromiseified(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; //1 hour from now
    const res = await ctx.db.mutation.updateUser({
      where: { email },
      data: { resetToken, resetTokenExpiry }
    });
    //email them the reset token
    const mailRes = await transport.sendMail({
      from: "aaron@candyboxmarketing.com",
      to: user.email,
      subject: "Your Password Reset Token",
      html: makeANiceEmail(`Your password reset token is here!
      \n\n
      <a href="${
        process.env.FRONTEND_URL
      }/reset?resetToken=${resetToken}">Click here to reset</a>`)
    });
    //return the message
    return { message: "Thanks!" };
  },
  async resetPassword(parent, args, ctx, info) {
    //check if the passwords match
    if (args.password !== args.confirmPassword) {
      throw new Error("Your passwords do not match");
    }
    // check if it's a legit reset token & not expired
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: Date.now() - 3600000
      }
    });
    if (!user) {
      throw new Error("This token is either invalid or expired");
    }
    //hash their new password
    const password = await bcrypt.hash(args.password, 10);
    //save the new password to the user and remove old reset token fields
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });
    //generate JWT token
    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    //set cookie with token
    ctx.response.cookie("token", token, {
      //can't access via JS or bad extensions etc
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 //1 year cookie
    });
    //return the user
    return updatedUser;
  },
  async updatePermissions(parent, args, ctx, info) {
    //check if they are logged in
    if (!ctx.request.userId) {
      throw new Error("You must be logged in");
    }
    //query current user
    const currentUser = await ctx.db.query.user(
      {
        where: {
          id: ctx.request.userId
        }
      },
      info
    );
    //check if they have permissions to do this
    hasPermission(currentUser, ["ADMIN", "PERMISSIONUPDATE"]);
    //update the permissions
    return ctx.db.mutation.updateUser(
      {
        data: {
          permissions: {
            set: args.permissions
          }
        },
        where: { id: args.userId }
      },
      info
    );
  },
  async addToCart(parent, args, ctx, info) {
    //check if signed in
    const { userId } = ctx.request;
    if (!userId) {
      throw new Error("You must be signed in to add an item to your cart");
    }
    //query the users current cart
    const [existingCartItem] = await ctx.db.query.cartItems({
      where: { user: { id: userId }, item: { id: args.id } }
    });
    //check if that item is already in their cart and increment by 1
    if (existingCartItem) {
      return ctx.db.mutation.updateCartItem(
        {
          where: { id: existingCartItem.id },
          data: { quantity: existingCartItem.quantity + 1 }
        },
        info
      );
    }
    //if not create a new cartItem for that user
    const cartItem = await ctx.db.mutation.createCartItem(
      {
        data: {
          user: { connect: { id: userId } },
          item: { connect: { id: args.id } }
        }
      },
      info
    );
    return cartItem;
  },
  async removeFromCart(parent, args, ctx, info) {
    //find the cart item
    const cartItem = await ctx.db.query.cartItem(
      {
        where: {
          id: args.id
        }
      },
      `{ id, user { id}}`
    );
    //Make sure we found an item
    if (!cartItem) throw new Error("No cart item found");
    //make sure they own that cart item
    if (cartItem.user.id !== ctx.request.userId) {
      throw new Error("You do not own this item!");
    }
    //delete that cart item
    return ctx.db.mutation.deleteCartItem(
      {
        where: { id: args.id }
      },
      info
    );
  },
  async createOrder(parent, args, ctx, info) {
    // query the current user and make sure they are signed in
    const { userId } = ctx.request;
    if (!userId)
      throw new Error("You must be signed in to complete this order");
    const user = await ctx.db.query.user(
      { where: { id: userId } },
      `{
        id
        name
        email
        cart {
          id
          quantity
          item { id title description image price}
        }
      }`
    );
    // recalculate the total for the price to avoid any frudelent changes in the frontend
    const amount = user.cart.reduce(
      (tally, cartItem) => tally + cartItem.item.price * cartItem.quantity,
      0
    );
    // create the stripe charge (turn token into $$$)
    const charge = await stripe.charges.create({
      amount: amount,
      currency: "USD",
      source: args.token,
      description: `Payment for ${user.name}'s order`,
      statement_descriptor: "Sick Fits"
    });
    // convert the CartItems to OrderItems
    // create the order
    // Clean up - clear the users cart, delete cartItems
    // return the Order to the client
  }
};

module.exports = Mutations;
