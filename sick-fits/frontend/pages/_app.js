import App, { Container } from "next/app";
import Page from "../components/Page";
import { ApolloProvider } from 'react-apollo'
import withData from '../lib/withData'

//Custom app router to keep state between multiple pages
class MyApp extends App {
  static async getInitialProps({ Component, ctx }) {
    let pageProps = {};
    if (Component.getInitialProps) {
      pageProps = await Component.getInitialProps(ctx);
    }
    //this exposes the query to the user
    pageProps.query = ctx.query;
    return { pageProps };
  }
  render() {
    //Component should be page component (e.g. sell.js) determined based off of current route
    const { Component, apollo, pageProps } = this.props;

    return (
      <Container>
        <ApolloProvider client={apollo}>
          <Page>
            <Component {...pageProps} />
          </Page>
        </ApolloProvider>
      </Container>
    );
  }
}

export default withData(MyApp);
