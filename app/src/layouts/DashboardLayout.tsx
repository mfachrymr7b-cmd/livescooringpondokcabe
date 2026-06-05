import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/shared/Sidebar";
import { TopBar } from "@/components/shared/TopBar";
import { MobileNav } from "@/components/shared/MobileNav";

export function DashboardLayout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#064E3B" }}>
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile drawer */}
      <MobileNav />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar />
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ background: "#064E3B" }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
