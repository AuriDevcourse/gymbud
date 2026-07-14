"use client";

// Last-resort boundary if the root layout itself throws — must render its own
// <html>/<body>. Kept minimal and dependency-free.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          background: "#0a0c0e",
          color: "#f3f5f7",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ color: "#8a929d", fontSize: "0.9rem", maxWidth: "30ch" }}>
          The app hit an unexpected error. Try reloading.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "8px",
            background: "#c8f135",
            color: "#0a0c0e",
            border: "none",
            borderRadius: "12px",
            padding: "12px 20px",
            fontWeight: 600,
            fontSize: "1rem",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
