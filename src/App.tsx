import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import { useState } from "react";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Auth/Login";
import PrivateRoute from "./routes/private";
import Dashboard from "./pages/Admin/Dashboard";
import AdminPortal from "./pages/Admin/AdminPortal";
import UserDashboard from "./pages/Users/Dashboard";
import { Toaster } from "react-hot-toast";
import IntroScreen from "./components/IntroScreen";

// import admin pages
import Agents from "./pages/Admin/Agents";
import Users from "./pages/Admin/Users";
import Numbers from "./pages/Admin/Numbers";
import AvailableNumbers from "./pages/Admin/AvailableNumbers";
import AvailableModels from "./pages/Admin/AvailableModels";
import EditWebPage from "./pages/Admin/EditWebPage";
import DemoRequests from "./pages/Admin/DemoRequests";
import CompanyRequests from "./pages/Admin/CompanyRequests";
import CompanyData from "./pages/Users/CompanyData";
import ReservedNumber from "./pages/Users/ReservedNumber";
import Recordings from "./pages/Users/Recordings";
import Billing from "./pages/Users/Billing";
import PublicInfoPage from "./pages/PublicInfoPage";
import Layout from "./Layout";

// Only show intro once per browser session
const hasSeenIntro = sessionStorage.getItem("peoplix_intro_seen") === "true";

function App() {
  const [showIntro, setShowIntro] = useState(!hasSeenIntro);

  const handleIntroDone = () => {
    sessionStorage.setItem("peoplix_intro_seen", "true");
    setShowIntro(false);
  };

  return (
    <>
      {/* Intro overlay — renders on top of everything, unmounts when done */}
      {showIntro && <IntroScreen onDone={handleIntroDone} />}

      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<Login />} />
          <Route path="/:slug" element={<PublicInfoPage />} />
          
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
