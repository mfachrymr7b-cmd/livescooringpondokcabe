import { Outlet } from "react-router-dom";
import golfBg from "@/assets/golf-bg.jpg";

export function AuthLayout() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-white relative"
      style={{
        backgroundImage: `url(${golfBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Dark overlay supaya form tetap terbaca */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
