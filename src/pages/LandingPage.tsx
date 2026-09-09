import { lazy, useEffect, useState } from "react";
import Navbar from "../components/LandingPageComponents/Navbar";
// const BookDemo = lazy(() => import("../components/LandingPageComponents/BookDemo"));
const Contact = lazy(() => import("../components/LandingPageComponents/Contact"));
const BusinessImpact = lazy(() => import("../components/LandingPageComponents/BuisnessValue"));
const Faqs = lazy(() => import("../components/LandingPageComponents/Faqs"));
const Features = lazy(() => import("../components/LandingPageComponents/Features"));
const Footer = lazy(() => import("../components/LandingPageComponents/Footer"));
const HeroSection = lazy(() => import("../components/LandingPageComponents/HeroSection"));
const LiveCallExperience = lazy(() => import("../components/LandingPageComponents/LiveCallExperience"));
const HowItWorks = lazy(() => import("../components/LandingPageComponents/HowItWorks"));
const Solution = lazy(() => import("../components/LandingPageComponents/Solution"));
const TheProblem = lazy(() => import("../components/LandingPageComponents/TheProblem"));
const WhoItsFor = lazy(() => import("../components/LandingPageComponents/WhoItFor"));

const LandingPage = () => {
  // Hide navbar during intro animation
  const [showNavbar, setShowNavbar] = useState(
    sessionStorage.getItem("peoplix_intro_seen") === "true"
  );

  useEffect(() => {
    // Check if intro is done every 100ms
    const checkIntro = setInterval(() => {
      if (sessionStorage.getItem("peoplix_intro_seen") === "true") {
        setShowNavbar(true);
        clearInterval(checkIntro);
      }
    }, 100);

    return () => clearInterval(checkIntro);
  }, []);

  return (
    <>
      {/* NAVBAR - FIXED POSITION CONTAINER (Hidden during intro) */}
      {showNavbar && (
        <div 
          id="navbar-fixed-wrapper"
          className="navbar-fixed-wrapper"
        >
          <Navbar />
        </div>
      )}

      {/* REST OF PAGE CONTENT */}
      <div className="bg-white text-gray-900">
        <HeroSection />

      <div id="problem">
        <TheProblem />
      </div>
      <LiveCallExperience />
      <div className="py-16 px-6 lg:px-16 border-t border-gray-100">
        <div id="solution">
          <Solution />
        </div>
        <Features />
      </div>
      <div className="pb-20 border-b border-gray-100">
        <HowItWorks />
      </div>
      <div id="company">
        <WhoItsFor />
      </div>
      <div id="resources">
        <BusinessImpact />
      </div>
      <Faqs />
      {/* <BookDemo /> */}
      <Contact />
      <Footer />
    </div>
    </>
  );
};

export default LandingPage;
