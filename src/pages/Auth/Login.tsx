import { useState } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Spinner from "../../components/Spinner";
import { loginApi } from "../../api/auth";
import "./Login.css";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Generic change handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.error("Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const data = await loginApi({
        email: formData.email,
        password: formData.password,
      });

      const accessToken = data?.accessToken || data?.token;
      const user = data?.user || {};
      const userRole = user.role || data?.role || "company_user";

      if (!accessToken) {
        throw new Error("No token returned from server");
      }

      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify({ email: user.email || formData.email }));
      localStorage.setItem("role", userRole);

      if (userRole === "super_admin" || userRole === "super-admin") {
        localStorage.setItem("adminUser", JSON.stringify({ email: user.email || formData.email }));
        localStorage.setItem("adminToken", accessToken);
        localStorage.setItem("role", "super_admin");
        toast.success("Welcome Admin!");
        navigate("/admin/portal");
        return;
      }

      toast.success("Login successfully");
      navigate(userRole === "company_admin" ? "/dashboard" : "/user/dashboard");
      
    } catch (err: any) {
      toast.error(err?.message || (typeof err === "string" ? err : "Invalid email or password"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-frame">
        <section className="login-art" aria-label="Peoplix HR assistant">
          <svg
            className="login-stage"
            viewBox="0 0 520 700"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <g stroke="#C9BC9E" strokeWidth="1" opacity="0.6">
              <line x1="0" y1="150" x2="520" y2="150" />
              <line x1="0" y1="330" x2="520" y2="330" />
              <line x1="0" y1="510" x2="520" y2="510" />
            </g>
            <g transform="translate(30,135)">
              <rect width="190" height="56" rx="16" fill="#FFFFFF" stroke="#17150F" strokeWidth="1.4" />
              <text x="18" y="34" fontFamily="Work Sans" fontSize="13" fill="#17150F">What are my benefits?</text>
            </g>
            <g transform="translate(310,470)">
              <rect width="176" height="56" rx="16" fill="#17150F" />
              <text x="18" y="34" fontFamily="Work Sans" fontSize="13" fill="#EFE8D8">Requesting time off</text>
            </g>
            <g transform="translate(60,540)">
              <rect width="168" height="56" rx="16" fill="#FFFFFF" stroke="#17150F" strokeWidth="1.4" />
              <text x="18" y="34" fontFamily="Work Sans" fontSize="13" fill="#17150F">Happy to help with that</text>
            </g>
          </svg>

          <div className="login-art-brand">Peoplix</div>

          <div className="login-art-copy">
            <h1>Everything you need<br />from HR, in one place.</h1>
            <p>Ask about benefits, request time off, or get step-by-step help — Peoplix keeps HR one conversation away.</p>
          </div>

          <div className="login-art-foot" aria-label="Peoplix services">
            <span><i className="login-dot" />Benefits</span>
            <span><i className="login-dot" />Time off</span>
            <span><i className="login-dot" />Support</span>
          </div>
        </section>

        <section className="login-panel">
          <button type="button" onClick={() => navigate("/")} className="login-back">
            <ArrowLeft size={14} />
            Back to home
          </button>

          <h2>Log in</h2>
          <p className="login-sub">Welcome back. Please enter your details.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div className="login-field login-password">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="login-eye"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="login-row">
              <label className="login-remember">
                <input type="checkbox" />
                Remember me
              </label>
            </div>

            <button className="login-cta" type="submit" disabled={loading}>
              Log in
            </button>
          </form>

          {loading && (
            <div className="login-loading-overlay" role="status" aria-label="Signing in">
              <Spinner color="#17150f" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default LoginPage;
