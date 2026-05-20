import api from "./api";

export type UserRole = "patient" | "receptionist" | "doctor" | "admin";

export interface AuthUser {
  userId: string;
  fullName: string;
  role: UserRole;
  accessToken: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post("/auth/login", { email, password });
  const user = data.data as AuthUser;
  persistAuth(user);
  return user;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  phone: string,
  role: UserRole = "patient"
): Promise<AuthUser> {
  const { data } = await api.post("/auth/register", { email, password, fullName, phone, role });
  const user = data.data as AuthUser;
  persistAuth(user);
  return user;
}

export async function logout(): Promise<void> {
  try {
    await api.post("/auth/logout");
  } finally {
    clearAuth();
    window.location.href = "/auth/login";
  }
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function getDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    patient: "/patient/dashboard",
    receptionist: "/receptionist/dashboard",
    doctor: "/doctor/dashboard",
    admin: "/admin/dashboard",
  };
  return paths[role];
}

// ─── Internal ─────────────────────────────────────────────────────────────────

function persistAuth(user: AuthUser) {
  localStorage.setItem("accessToken", user.accessToken);
  localStorage.setItem("user", JSON.stringify(user));
  // Set role cookie for middleware route guard
  document.cookie = `userRole=${user.role}; path=/; SameSite=Strict`;
  document.cookie = `accessToken=${user.accessToken}; path=/; SameSite=Strict`;
}

function clearAuth() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
  document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}
