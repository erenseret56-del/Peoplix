import type { JSX } from "react";
import { Navigate } from "react-router-dom";

interface Props {
  children: JSX.Element;
  allowedRoles: string[];
}

const PrivateRoute = ({ children, allowedRoles }: Props) => {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  const normalizedRole = role?.toLowerCase();

  const isAllowed = allowedRoles.some((allowedRole) => {
    const normalizedAllowed = allowedRole.toLowerCase();
    return normalizedAllowed === normalizedRole ||
      (normalizedAllowed === "admin" && (normalizedRole === "super_admin" || normalizedRole === "company_admin" || normalizedRole === "super-admin" || normalizedRole === "company-admin")) ||
      (normalizedAllowed === "user" && (normalizedRole === "company_user" || normalizedRole === "company-user"));
  });

  if (!token) {
    return <Navigate to="/signin" replace />;
  }

  if (!isAllowed) {
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default PrivateRoute;
