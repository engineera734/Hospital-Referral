export type UserRole = "admin" | "doctor" | "reception" | "accountant";

export function roleHome(role: UserRole) {
  if (role === "admin") return "/dashboard/admin";
  if (role === "doctor") return "/dashboard/doctor";
  if (role === "reception") return "/dashboard/reception";
  if (role === "accountant") return "/dashboard/accounting";
  return "/login";
}
