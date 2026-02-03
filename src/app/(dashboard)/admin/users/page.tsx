import { redirect } from "next/navigation";

// Redirect old URL to new settings page
export default function AdminUsersPage() {
  redirect("/settings/users");
}
