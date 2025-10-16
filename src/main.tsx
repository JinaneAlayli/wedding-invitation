// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import "./index.css";

import Cover from "./pages/cover";
import InviteForm from "./pages/Invite";
import Dashboard from "./pages/Dashboard";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      // صفحة الغلاف القياسية للجميع
      { path: "invite/:slug", element: <Cover /> },
      // صفحة الرد الحقيقي
      { path: "invite/:slug/rsvp", element: <InviteForm /> },
      // لوحة التحكم لديك
      { path: "dashboard", element: <Dashboard /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
