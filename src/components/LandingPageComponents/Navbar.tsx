import { useState, useEffect } from "react";
import defaultLogo from "../../assets/images/peoplix-logo.png";
import { useNavigate } from "react-router-dom";
import { useSiteConfig } from "../../hooks/useSiteConfig";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { config: siteConfig } = useSiteConfig();

  const logoSrc = siteConfig.logo_data_url || defaultLogo;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      style={{
        padding: scrolled ? "8px 16px" : "20px 16px",
        transition: 'padding 0.35s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: scrolled ? "820px" : "1200px",
          background: scrolled ? "rgba(255,255,255,0.97)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
          borderRadius: scrolled ? "999px" : "0",
          boxShadow: scrolled
            ? "0 0 0 1px rgba(0,0,0,0.08), 0 2px 24px rgba(0,0,0,0.07)"
            : "none",
          padding: scrolled ? "8px 20px" : "0 8px",
          transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          aria-label="Back to top"
          style={{
            width: scrolled ? "220px" : "280px",
            height: scrolled ? "72px" : "96px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            overflow: "hidden",
            flexShrink: 0,
            cursor: "pointer",
            transition: "width 0.35s cubic-bezier(0.4,0,0.2,1), height 0.35s cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <img
            src={logoSrc}
            alt="Peoplix"
            loading="eager"
            decoding="async"
            style={{
              display: "block",
                width: scrolled ? "72px" : "96px",
              height: "100%",
                maxWidth: scrolled ? "72px" : "96px",
              maxHeight: "100%",
              objectFit: "contain",
                objectPosition: "center",
            }}
          />
            <span
              style={{
                color: "#17150F",
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: scrolled ? "30px" : "40px",
                fontWeight: 500,
                lineHeight: 1,
                letterSpacing: "-0.02em",
                marginLeft: scrolled ? "-22px" : "-28px",
                transform: "translateY(6px)",
              }}
            >
              eoplix
            </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate("/signin")}
            style={{
              fontSize: scrolled ? "13px" : "14px",
              padding: scrolled ? "6px 14px" : "8px 16px",
              borderRadius: "999px",
              color: "#374151",
              background: "transparent",
              boxShadow: scrolled ? "0 0 0 1px rgba(0,0,0,0.12)" : "none",
              border: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            }}
          >
            Log in
          </button>

          <button
            onClick={() =>
              document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })
            }
            style={{
              fontSize: scrolled ? "13px" : "14px",
              padding: scrolled ? "6px 16px" : "8px 20px",
              borderRadius: "999px",
              background: "#111827",
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
              transition: 'all 0.35s cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Book a Demo
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
