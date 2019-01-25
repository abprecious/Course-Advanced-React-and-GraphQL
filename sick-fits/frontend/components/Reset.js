import React, { Component } from "react";
import { Mutation } from "react-apollo";
import gql from "graphql-tag";
import Proptypes from "prop-types";
import Router from "next/router";

import Form from "./styles/Form";
import Error from "./ErrorMessage";

import { CURRENT_USER_QUERY } from "./User";

const RESET_MUTATION = gql`
  mutation RESET_MUTATION(
    $resetToken: String!
    $password: String!
    $confirmPassword: String!
  ) {
    resetPassword(
      resetToken: $resetToken
      password: $password
      confirmPassword: $confirmPassword
    ) {
      id
      name
      email
    }
  }
`;

class Reset extends Component {
  static propTypes = {
    resetToken: Proptypes.string.isRequired
  };
  state = {
    password: "",
    confirmPassword: ""
  };
  saveToState = e => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };
  render() {
    return (
      <Mutation
        mutation={RESET_MUTATION}
        variables={{
          resetToken: this.props.resetToken,
          password: this.state.password,
          confirmPassword: this.state.confirmPassword
        }}
        refetchQueries={[{ query: CURRENT_USER_QUERY }]}
      >
        {(reset, { error, loading, called }) => {
          return (
            <Form
              method="POST"
              onSubmit={async e => {
                e.preventDefault();
                await reset();
                this.setState({
                  password: "",
                  confirmPassword: ""
                });
                //redirect them to account page
                Router.push({
                  pathname: "/me"
                });
              }}
            >
              <fieldset disabled={loading} aria-busy={loading}>
                <h2>Reset Your Password</h2>
                <Error error={error} />
                {!error && !loading && called && (
                  <p>
                    Success! Your password has been reset and you are now logged
                    in!
                  </p>
                )}
                <label htmlFor="password">
                  Password
                  <input
                    type="password"
                    name="password"
                    placeholder="password"
                    value={this.state.password}
                    onChange={this.saveToState}
                  />
                </label>
                <label htmlFor="confirmPassword">
                  Confirm Your Password
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="confirmPassword"
                    value={this.state.confirmPassword}
                    onChange={this.saveToState}
                  />
                </label>
              </fieldset>
              <button type="submit">Reset Password</button>
            </Form>
          );
        }}
      </Mutation>
    );
  }
}

export default Reset;
