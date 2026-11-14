import { lazy, Suspense } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./AppShell";

const HubPage = lazy(() => import("@/features/hub/HubPage"));
const CashPage = lazy(() => import("@/features/cash/CashPage"));
const ForecastPage = lazy(() => import("@/features/forecast/ForecastPage"));
const FxPage = lazy(() => import("@/features/fx/FxPage"));
const PaymentsPage = lazy(() => import("@/features/payments/PaymentsPage"));
const ExceptionsPage = lazy(() => import("@/features/exceptions/ExceptionsPage"));
const AgentsPage = lazy(() => import("@/features/agents/AgentsPage"));
const SourcesPage = lazy(() => import("@/features/sources/SourcesPage"));
const AuditPage = lazy(() => import("@/features/audit/AuditPage"));
const NotFound = lazy(() => import("./NotFound"));

function Loading() {
  return (
    <div aria-busy="true" className="space-y-4" role="status">
      <span className="sr-only">Loading page</span>
      <div className="h-8 w-64 animate-pulse rounded-habibiMd bg-gray-100" />
      <div className="h-32 animate-pulse rounded-habibiLg bg-gray-100" />
      <div className="h-64 animate-pulse rounded-habibiLg bg-gray-100" />
    </div>
  );
}

const page = (el: JSX.Element) => <Suspense fallback={<Loading />}>{el}</Suspense>;

const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: page(<HubPage />) },
      { path: "cash", element: page(<CashPage />) },
      { path: "forecast", element: page(<ForecastPage />) },
      { path: "fx", element: page(<FxPage />) },
      { path: "payments", element: page(<PaymentsPage />) },
      { path: "exceptions", element: page(<ExceptionsPage />) },
      { path: "agents", element: page(<AgentsPage />) },
      { path: "sources", element: page(<SourcesPage />) },
      { path: "audit", element: page(<AuditPage />) },
      { path: "*", element: page(<NotFound />) },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
