"use client";

import { useEffect } from "react";

export default function MobileBootPage() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.replace("/mobile/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100dvh",
        background: "linear-gradient(180deg, #f8fffb 0%, #ffffff 45%, #0f766e 100%)",
        overflow: "hidden",
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src="/branding/splash-vertical.png"
        alt="مستشفى الرفاعي"
        style={{
          width: "100%",
          height: "100%",
          maxWidth: "430px",
          objectFit: "contain",
          display: "block",
          backgroundColor: "#ffffff",
        }}
      />
    </main>
  );
}

