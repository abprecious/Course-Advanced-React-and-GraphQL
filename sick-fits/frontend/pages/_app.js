import App, { Container } from "next/app";
import Page from "../components/Page";

//Custom app router to keep state between multiple pages
class MyApp extends App {
  render() {
    //Component should be page component (e.g. sell.js) determined based off of current route
    const { Component } = this.props;

    return (
      <Container>
        <Page>
          <Component />
        </Page>
      </Container>
    );
  }
}

export default MyApp;
