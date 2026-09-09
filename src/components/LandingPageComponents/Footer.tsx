import Logo from "../../assets/images/peoplix-logo.png";
import { Link } from "react-router-dom";

const FooterSection = () => {
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <>
      <style>{`
        .footer-root {
          position: relative;
          overflow: hidden;
        }

        .footer-watermark {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: clamp(80px, 18vw, 1000px);
          font-weight: 700;
          letter-spacing: 0.18em;
          color: transparent;
          -webkit-text-stroke: 1.5px rgba(0,0,0,0.04);
          text-stroke: 1.5px rgba(0,0,0,0.04);
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          line-height: 1;
        }

        .footer-logo-box {
          width: 72px;
          height: 72px;
          border-radius: 18px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          flex-shrink: 0;
          margin-bottom: 24px;
        }

        .footer-link {
          color: #6b7280;
          font-size: 14px;
          font-weight: 400;
          text-decoration: none;
          transition: color 0.15s ease;
          line-height: 1;
        }
        .footer-link:hover { color: #111827; }

        .footer-col-heading {
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin: 0 0 20px 0;
        }

        .footer-divider {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .back-to-top-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: opacity 0.15s ease;
          white-space: nowrap;
        }
        .back-to-top-btn:hover { opacity: 0.6; }

        .footer-fade {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to top,
            rgba(255,255,255,1) 20%,
            rgba(255,255,255,0.95) 45%,
            rgba(255,255,255,0.6) 70%,
            rgba(255,255,255,0.2) 75%,
            rgba(255,255,255,0) 100%
          );
          pointer-events: none;
        }

        /* ─── Layout: inner wrapper ─── */
        .footer-inner {
          position: relative;
          z-index: 1;
          max-width: 1360px;
          margin: 0 auto;
          padding: clamp(100px, 12vw, 180px) clamp(20px, 5vw, 40px) 40px;
        }

        /* ─── Top section: brand left, cols right ─── */
        .footer-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 40px;
        }

        .footer-brand {
          max-width: 300px;
          flex-shrink: 0;
        }

        .footer-brand-desc {
          font-size: 14px;
          line-height: 1.75;
          color: var(--color-text-gray);
          font-weight: 400;
          margin: 0;
        }

        /* ─── Three-column link grid ─── */
        .footer-cols {
          display: grid;
          grid-template-columns: repeat(3, 160px);
          gap: 40px;
          flex-shrink: 0;
        }

        .footer-col ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ─── Bottom bar ─── */
        .footer-bottom {
          margin-top: 64px;
        }

        .footer-bottom-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .footer-copyright {
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          font-weight: 400;
        }

        /* ═══════════════════════════════════════
           RESPONSIVE BREAKPOINTS
        ═══════════════════════════════════════ */

        /* ── Tablet: ≤ 900px ── */
        @media (max-width: 900px) {
          .footer-top {
            flex-direction: column;
            gap: 36px;
          }

          .footer-brand {
            max-width: 100%;
          }

          .footer-cols {
            width: 100%;
            grid-template-columns: repeat(3, 1fr);
            gap: 24px 20px;
          }
        }

        /* ── Mobile: ≤ 560px ── */
        @media (max-width: 560px) {
          .footer-cols {
            grid-template-columns: 1fr 1fr;
            gap: 28px 24px;
          }

          /* Legal spans full width on its own row */
          .footer-col-legal {
            grid-column: 1 / -1;
          }

          .footer-bottom {
            margin-top: 40px;
          }

          .footer-bottom-bar {
            flex-direction: column;
            align-items: flex-start;
          }
        }

        /* ── Small mobile: ≤ 380px ── */
        @media (max-width: 380px) {
          .footer-cols {
            grid-template-columns: 1fr;
          }

          .footer-col-legal {
            grid-column: auto;
          }

          .footer-logo-box {
            width: 60px;
            height: 60px;
            border-radius: 14px;
          }
        }
      `}</style>

      <footer className="footer-root">
        {/* Watermark */}
        <div className="footer-watermark mt-5" aria-hidden="true">
          Peoplix
        </div>

        {/* Gradient fade overlay */}
        <div className="footer-fade" aria-hidden="true" />

        {/* Main content */}
        <div className="footer-inner">
          {/* ── Top: brand + columns ── */}
          <div className="footer-top">
            {/* Brand block */}
            <div className="footer-brand">
              <div className="footer-logo-box">
                <img
                  src={Logo}
                  alt="Peoplix Logo"
                  className="w-12 object-cover"
                />
              </div>
              <p className="footer-brand-desc">
                Peoplix builds intelligent AI agents that resolve enterprise
                service requests end-to-end starting with HR operations and
                expanding across shared services.
              </p>
            </div>

            {/* Link columns */}
            <div className="footer-cols">
              {/* Resources */}
              <div className="footer-col">
                <p className="footer-col-heading">Resources</p>
                <ul>
                  {[
                    ["Book a Demo", "/book-demo"],
                    ["Watch 2-min Overview", "/overview"],
                    ["Case Studies", "/case-studies"],
                    ["Blog", "/blog"],
                  ].map((link) => (
                    <li key={link[0]}>
                      <Link to={link[1]} className="footer-link">{link[0]}</Link>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Company */}
              <div className="footer-col">
                <p className="footer-col-heading">Company</p>
                <ul>
                  {[["About Peoplix", "/about"], ["Leadership", "/leadership"], ["Careers", "/careers"], ["Contact", "/contact"]].map(
                    (link) => (
                      <li key={link[0]}>
                        <Link to={link[1]} className="footer-link">{link[0]}</Link>
                      </li>
                    ),
                  )}
                </ul>
              </div>

              {/* Legal */}
              <div className="footer-col footer-col-legal">
                <p className="footer-col-heading">Legal</p>
                <ul>
                  {[
                    ["Privacy Policy", "/privacy"],
                    ["Terms of Service", "/terms"],
                    ["Security & Compliance", "/security"],
                  ].map((link) => (
                    <li key={link[0]}>
                      <Link to={link[1]} className="footer-link">{link[0]}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ── Bottom bar ── */}
          <div className="footer-bottom">
            <hr className="footer-divider" />
            <div className="footer-bottom-bar">
              <p className="footer-copyright">
                © {new Date().getFullYear()} Peoplix. All Rights Reserved.
              </p>
              <button className="back-to-top-btn" onClick={scrollToTop}>
                Back to top{" "}
                <span style={{ fontSize: "16px", lineHeight: 1 }}>↑</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default FooterSection;
