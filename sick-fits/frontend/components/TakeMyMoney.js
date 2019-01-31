import React from "react";
import StripeCheckout from "react-stripe-checkout";
import { Mutation } from "react-apollo";
import Router from "next/router";
import NProgress from "nprogress";
import PropTypes from "prop-types";
import gql from "graphql-tag";
import { adopt } from "react-adopt";

import calcTotalPrice from "../lib/calcTotalPrice";
import Error from "./ErrorMessage";
import User, { CURRENT_USER_QUERY } from "./User";
import { TOGGLE_CART_MUTATION } from "../components/Cart";

const CREATE_ORDER_MUTATION = gql`
  mutation createOder($token: String!) {
    createOrder(token: $token) {
      id
      charge
      total
      items {
        id
        title
      }
    }
  }
`;

const Composed = adopt({
  user: ({ render }) => <User>{render}</User>,
  toggleCart: ({ render }) => (
    <Mutation mutation={TOGGLE_CART_MUTATION}>{render}</Mutation>
  ),
  createOrder: ({ render }) => (
    <Mutation
      mutation={CREATE_ORDER_MUTATION}
      refetchQueries={[{ query: CURRENT_USER_QUERY }]}
    >
      {render}
    </Mutation>
  )
});

function totalItems(cart) {
  return cart.reduce((tally, cartItem) => tally + cartItem.quantity, 0);
}

class TakeMyMoney extends React.Component {
  onToken = async (res, createOder, toggleCart) => {
    toggleCart();
    NProgress.start();
    //manually call the mutation once we have the strip token
    const order = await createOder({
      variables: {
        token: res.id
      }
    }).catch(err => {
      alert(err.message);
    });
    Router.push({
      pathname: "/order",
      query: { id: order.data.createOrder.id }
    });
  };
  render() {
    return (
      <Composed>
        {({ user, toggleCart, createOrder }) => {
          const me = user.data.me;
          if (!me) return null;
          return (
            <StripeCheckout
              amount={calcTotalPrice(me.cart)}
              name="Sick Fits"
              description={`Order of ${totalItems(me.cart)} Items`}
              image={me.cart.length && me.cart[0].item && me.cart[0].item.image}
              stripeKey="pk_test_xI63UZT9OcMc2jtEe7bRBdaz"
              currency="USD"
              email={me.email}
              token={res => this.onToken(res, createOrder, toggleCart)}
            >
              {this.props.children}
            </StripeCheckout>
          );
        }}
      </Composed>
    );
  }
}

export default TakeMyMoney;
