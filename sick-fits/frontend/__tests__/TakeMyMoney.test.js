import { mount } from "enzyme";
import toJSON from "enzyme-to-json";
import NProgress from "nprogress";
import wait from "waait";
import Router from "next/router";
import { MockedProvider } from "react-apollo/test-utils";
import { ApolloConsumer } from "react-apollo";
import TakeMyMoney, { CREATE_ORDER_MUTATION } from "../components/TakeMyMoney";
import { CURRENT_USER_QUERY } from "../components/User";
import { fakeUser, fakeCartItem } from "../lib/testUtils";

Router.router = { push() {} };

const mocks = [
  {
    request: { query: CURRENT_USER_QUERY },
    result: {
      data: {
        me: {
          ...fakeUser(),
          cart: [fakeCartItem({ id: "abc123" })]
        }
      }
    }
  }
];

describe("<TakeMyMoney />", () => {
  it("renders and matches snapshot", async () => {
    const wrapper = mount(
      <MockedProvider mocks={mocks}>
        <TakeMyMoney />
      </MockedProvider>
    );
    await wait();
    wrapper.update();
    const checkoutButton = wrapper.find("ReactStripeCheckout");
    expect(toJSON(checkoutButton)).toMatchSnapshot();
  });
  it("creates an order ontoken", async () => {
    const createOrderMock = jest.fn().mockResolvedValue({
      data: {
        createOrder: {
          id: "xyz789"
        }
      }
    });
    const toggleCart = jest.fn();
    const wrapper = mount(
      <MockedProvider mocks={mocks}>
        <TakeMyMoney />
      </MockedProvider>
    );
    const component = wrapper.find("TakeMyMoney").instance();
    //manually call that onToken method
    component.onToken({ id: "abc123" }, createOrderMock, toggleCart);
    expect(createOrderMock).toHaveBeenCalled();
    expect(createOrderMock).toHaveBeenCalledWith({
      variables: {
        token: "abc123"
      }
    });
  });
  it("turns the progress bar on", async () => {
    const wrapper = mount(
      <MockedProvider mocks={mocks}>
        <TakeMyMoney />
      </MockedProvider>
    );
    await wait();
    wrapper.update();
    NProgress.start = jest.fn();
    const toggleCart = jest.fn();
    const createOrderMock = jest.fn().mockResolvedValue({
      data: {
        createOrder: {
          id: "xyz789"
        }
      }
    });
    const component = wrapper.find("TakeMyMoney").instance();
    component.onToken({ id: "abc123" }, createOrderMock, toggleCart);
    expect(NProgress.start).toHaveBeenCalled();
  });

  it("routes to the order page when completed", async () => {
    const wrapper = mount(
      <MockedProvider mocks={mocks}>
        <TakeMyMoney />
      </MockedProvider>
    );
    await wait();
    wrapper.update();
    const toggleCart = jest.fn();
    const createOrderMock = jest.fn().mockResolvedValue({
      data: {
        createOrder: {
          id: "xyz789"
        }
      }
    });
    const component = wrapper.find("TakeMyMoney").instance();
    Router.router.push = jest.fn();
    component.onToken({ id: "abc123" }, createOrderMock, toggleCart);
    await wait();
    expect(Router.router.push).toHaveBeenCalled();
  });
});
