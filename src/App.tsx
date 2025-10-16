// src/App.tsx
import { Outlet, Link } from "react-router-dom";

export default function App() {
  return (
    <div className="min-h-screen  text-ink overflow-x-hidden">
      {/* Optional tiny header so you know routing works */}
      <header className="mx-auto max-w-screen-2xl px-4 py-2">
        {/* <Link to="/" className="font-semibold">Wedding App</Link> */}
        {/* 
        <nav className="space-x-4 text-sm opacity-70">
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav> 
        */}
      </header>

      <main className="mx-auto w-full max-w-screen-2xl ">
        {/* This is where child routes render */}
        <Outlet />
      </main>
    </div>
  );
}
