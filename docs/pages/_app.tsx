import { GlowProvider } from "@glow-xyz/glow-react";
import "@glow-xyz/glow-react/dist/styles.css";

import { NetworkProvider } from "../components/NetworkContext";

import type { AppProps } from "next/app";
import { useRouter } from "next/router";
import { Header } from "../components/all-pages/Header";
import { NextPreviousButtons } from "../components/all-pages/NextPreviousButtons";
import { TabBar } from "../components/all-pages/TabBar";
import { Footer } from "../components/all-pages/Footer";
import { SocialHead } from "../components/SocialHead";
import "../public/globals.css";
import "../styles/app.scss";

import { ResponsiveBreakpoint } from "../utils/style-constants";

export default function App(props: AppProps) {
  const { Component, pageProps } = props;
  const router = useRouter();

  if (router.pathname.startsWith("/docs")) {
    return <DocsPage {...props} />;
  }

  return (
    <GlowProvider>
      <NetworkProvider>
        <Component {...pageProps} />
      </NetworkProvider>
    </GlowProvider>
  );
}

const DocsPage = ({ Component, pageProps }: AppProps) => {
  return (
    <GlowProvider>
      <NetworkProvider>
        <SocialHead subtitle={pageProps.markdoc?.frontmatter.title} />

        <div className="wrapper">
          <Header />

          <div className="content">
            <nav className="desktop">
              <div className="nav-inner">
                <TabBar />
              </div>
            </nav>

            <main className={"min-width-0"}>
              <Component {...pageProps} />

              <NextPreviousButtons />
            </main>
          </div>

          <Footer />
        </div>

        <style jsx>{`
          .wrapper {
            min-height: 100vh;
          }

          .content {
            display: grid;
            grid-template-columns: max-content 1fr;
            grid-column-gap: 6rem;
            height: 100%;
            width: 100%;
            max-width: 60rem;
            margin: 0 auto;
          }

          nav.desktop {
            height: 100%;
          }

          nav.desktop .nav-inner {
            padding-left: 0.75rem;
            position: sticky;
            top: 8rem;
          }

          main {
            padding-top: 3rem;
            padding-bottom: 5rem;
            padding-right: 1.5rem;
            min-height: 90vh; // Push the footer down on small pages
          }

          @media (max-width: ${ResponsiveBreakpoint.medium}) {
            .content {
              display: block;
            }
            nav.desktop {
              display: none;
            }
            main {
              padding: 1.5rem;
              padding-bottom: 6rem;
            }
          }
        `}</style>
      </NetworkProvider>
    </GlowProvider>
  );
};
