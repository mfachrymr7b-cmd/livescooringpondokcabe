import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/Toaster";

export function RootLayout() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Outlet />
      <Toaster />
    </div>
  );
}
