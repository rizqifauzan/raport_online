import { redirect } from "next/navigation";

// Buka langsung ke dashboard saat akses root (localhost:3000)
export default function HomePage() {
  redirect("/dashboard-a");
}
