import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexProvider } from "@/app/providers/ConvexProvider";
import { App } from "@/app/App";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <ConvexProvider>
        <App />
      </ConvexProvider>
    </ErrorBoundary>
  </StrictMode>
);
