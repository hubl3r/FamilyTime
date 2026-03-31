// src/components/LandscapeWrapper.tsx
// Applies landscape-specific padding/margin when device is in landscape
"use client";
import { useEffect, useState, ReactNode } from "react";

export default function LandscapeWrapper({ children }: { children: ReactNode }) {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const check = () => {
      setIsLandscape(window.innerWidth > window.innerHeight * 1.2);
    };
    check();
    window.addEventListener("resize", check);
    window.addEventListener("orientationchange", check);
    return () => {
      window.removeEventListener("resize", check);
      window.removeEventListener("orientationchange", check);
    };
  }, []);

  if (!isLandscape) return <>{children}</>;

  return (
    <div style={{ paddingLeft: "var(--nav-width, 72px)" }}>
      {children}
    </div>
  );
}
