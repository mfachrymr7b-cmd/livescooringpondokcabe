import { BrowserRouter } from "react-router-dom";
import { SessionChecker } from "@/components/shared/SessionChecker";
import { AppRoutes } from "@/routes";

export function App() {
  return (
    <BrowserRouter>
      <SessionChecker>
        <AppRoutes />
      </SessionChecker>
    </BrowserRouter>
  );
}
