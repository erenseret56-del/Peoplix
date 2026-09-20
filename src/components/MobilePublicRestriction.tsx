import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/peoplix-logo.png";
import "./MobilePublicRestriction.css";

const MOBILE_EXPERIENCE_QUERY = "(max-width: 767px), (max-width: 1024px) and (hover: none) and (pointer: coarse)";

export function useMobileExperienceViewport() {
  const [matches, setMatches] = useState(() => typeof window !== "undefined" && window.matchMedia(MOBILE_EXPERIENCE_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_EXPERIENCE_QUERY);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return matches;
}

function MobilePublicRestriction() {
  return (
    <main className="mobile-public-lock">
      <div className="mobile-public-lock__content">
        <div className="mobile-public-lock__brand" aria-label="PEOPLIX">
          <img src={logo} width="54" height="54" alt="" />
          <span>PEOPLIX</span>
        </div>
        <span className="mobile-public-lock__rule" aria-hidden="true" />
        <h1>Please come back on desktop.</h1>
        <p>PEOPLIX&apos;s full experience is designed for desktop. For the conference experience, visit the Conference page.</p>
        <Link to="/conference">Visit the Conference Experience</Link>
      </div>
    </main>
  );
}

export function MobilePublicRoute({ children }: { children: ReactNode }) {
  return useMobileExperienceViewport() ? <MobilePublicRestriction /> : children;
}

export default MobilePublicRestriction;
