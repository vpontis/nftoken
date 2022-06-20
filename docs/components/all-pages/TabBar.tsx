import classNames from "classnames";
import Link from "next/link";
import { useRouter } from "next/router";
import { ResponsiveBreakpoint } from "../../utils/style-constants";
import { DOC_PAGES } from "./navigation-constants";

export const TabBar = () => {
  const router = useRouter();

  const currentNavItem = DOC_PAGES.find(
    (item) => item.href === router.pathname
  );

  return (
    <>
      <div className="container">
        {currentNavItem && (
          <div
            className="active-highlight"
            style={{
              top: DOC_PAGES.indexOf(currentNavItem) * 2.25 + "rem"
            }}
          ></div>
        )}

        {DOC_PAGES.map((item) => (
          <div className="nav-item" key={item.title}>
            <Link href={item.href}>
              <a
                className={classNames({
                  current: router.pathname === item.href
                })}
              >
                {item.title}
              </a>
            </Link>
          </div>
        ))}
      </div>

      <style jsx>{`
        .container {
          position: relative;
        }

        a {
          display: block;
          margin-bottom: 0.25rem;
          padding: 0.25rem 0.75rem;
          color: var(--secondary-color);
          font-weight: var(--medium-font-weight);
          border-radius: var(--border-radius);
          transition: var(--transition);
        }

        a:not(.current):hover {
          color: var(--primary-color);
          background-color: var(--tertiary-bg-color);
        }

        a.current {
          color: var(--white);
        }

        .active-highlight {
          position: absolute;
          left: 0;
          height: 2rem;
          width: 100%;
          background-color: var(--brand-color);
          border-radius: var(--border-radius);
          z-index: -1;
          transition: var(--transition);
        }

        @media (max-width: ${ResponsiveBreakpoint.medium}) {
          .active-highlight {
            display: none;
          }

          a.current {
            background-color: var(--brand-color);
          }
        }
      `}</style>
    </>
  );
};
