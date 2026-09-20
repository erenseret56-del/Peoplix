import { BrowserRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import "./App.css";
import { lazy, Suspense, useState } from "react";
const LandingPage = lazy(() => import("./pages/LandingPage"));
const Login = lazy(() => import("./pages/Auth/Login"));
import PrivateRoute from "./routes/private";
const Dashboard = lazy(() => import("./pages/Admin/Dashboard"));
const AdminPortal = lazy(() => import("./pages/Admin/AdminPortal"));
const UserDashboard = lazy(() => import("./pages/Users/Dashboard"));
import { Toaster } from "react-hot-toast";
import { MobilePublicRoute, useMobileExperienceViewport } from "./components/MobilePublicRestriction";
const IntroScreen = lazy(() => import("./components/IntroScreen"));

// import admin pages
const Agents = lazy(() => import("./pages/Admin/Agents"));
const Users = lazy(() => import("./pages/Admin/Users"));
const Numbers = lazy(() => import("./pages/Admin/Numbers"));
const AvailableNumbers = lazy(() => import("./pages/Admin/AvailableNumbers"));
const AvailableModels = lazy(() => import("./pages/Admin/AvailableModels"));
const EditWebPage = lazy(() => import("./pages/Admin/EditWebPage"));
const DemoRequests = lazy(() => import("./pages/Admin/DemoRequests"));
const CompanyRequests = lazy(() => import("./pages/Admin/CompanyRequests"));
const CompanyData = lazy(() => import("./pages/Users/CompanyData"));
const ReservedNumber = lazy(() => import("./pages/Users/ReservedNumber"));
const Recordings = lazy(() => import("./pages/Users/Recordings"));
const Billing = lazy(() => import("./pages/Users/Billing"));
const PublicInfoPage = lazy(() => import("./pages/PublicInfoPage"));
const Layout = lazy(() => import("./Layout"));
const ConferencePage = lazy(() => import("./pages/Conference/ConferencePage"));
const ConferenceActivity = lazy(() => import("./pages/Admin/ConferenceActivity"));

// Only show intro once per browser session
const hasSeenIntro = sessionStorage.getItem("peoplix_intro_seen") === "true";

function SiteIntro() {
  const { pathname } = useLocation();
  const [showIntro, setShowIntro] = useState(!hasSeenIntro);
  const mobileExperience = useMobileExperienceViewport();

  const handleIntroDone = () => {
    sessionStorage.setItem("peoplix_intro_seen", "true");
    setShowIntro(false);
  };

  return showIntro && !mobileExperience && pathname.replace(/\/+$/, '') !== '/conference' ? <Suspense fallback={null}><IntroScreen onDone={handleIntroDone} /></Suspense> : null;
}

function App() {

  return (
    <>
      {/* Intro overlay — renders on top of everything, unmounts when done */}

      <BrowserRouter>
        <SiteIntro />
        <Suspense fallback={<div role="status" className="min-h-screen bg-white text-neutral-600 grid place-items-center text-sm">Loading PEOPLIX…</div>}>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<MobilePublicRoute><LandingPage /></MobilePublicRoute>} />
          <Route path="/signin" element={<Login />} />
          <Route path="/conference" element={<ConferencePage />} />
          <Route path="/admin/conference" element={<PrivateRoute allowedRoles={["super_admin"]}><ConferenceActivity /></PrivateRoute>} />
          <Route path="/:slug" element={<MobilePublicRoute><PublicInfoPage /></MobilePublicRoute>} />
          
          {/* Admin Portal (no auth required for now, just UI) */}
          <Route
            path="/admin/portal"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <AdminPortal />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/edit-webpage"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <EditWebPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/demo-requests"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <DemoRequests />
              </PrivateRoute>
            }
          />
          <Route
            path="/admin/company-requests"
            element={
              <PrivateRoute allowedRoles={["admin"]}>
                <CompanyRequests />
              </PrivateRoute>
            }
          />
          <Route path="/admin/available-numbers" element={<PrivateRoute allowedRoles={["admin"]}><AvailableNumbers /></PrivateRoute>} />
          <Route path="/admin/available-models" element={<PrivateRoute allowedRoles={["admin"]}><AvailableModels /></PrivateRoute>} />

          {/* Admin Route */}
          <Route element={<Layout><Outlet /></Layout>}>
            <Route
              path="/dashboard"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/agents"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <Agents />
                </PrivateRoute>
              }
            />
            <Route
              path="/users"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <Users />
                </PrivateRoute>
              }
            />
            <Route
              path="/numbers"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <Numbers />
                </PrivateRoute>
              }
            />
            <Route path="/company-data" element={<PrivateRoute allowedRoles={["admin"]}><CompanyData /></PrivateRoute>} />
            <Route path="/company-data/:numberId" element={<PrivateRoute allowedRoles={["admin"]}><CompanyData /></PrivateRoute>} />
            <Route path="/reserved-number" element={<PrivateRoute allowedRoles={["admin"]}><ReservedNumber /></PrivateRoute>} />
            <Route path="/recordings" element={<PrivateRoute allowedRoles={["admin"]}><Recordings /></PrivateRoute>} />
            <Route path="/billing" element={<PrivateRoute allowedRoles={["company_admin"]}><Billing /></PrivateRoute>} />
          </Route>
          
          {/* User Route */}
          <Route
            path="/user/dashboard"
            element={
              <PrivateRoute allowedRoles={["user"]}>
                <UserDashboard />
              </PrivateRoute>
            }
          />
        </Routes>
        </Suspense>
      </BrowserRouter>

      <Toaster
        position="top-right"
        containerStyle={{
          zIndex: 99999999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: "#111827",
            color: "#fff",
            zIndex: 9999999,
          },
        }}
      />
    </>
  );
}

export default App;
