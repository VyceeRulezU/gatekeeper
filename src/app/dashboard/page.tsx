import { redirect } from "next/navigation";
import { getIronSession } from "@/lib/session";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Dashboard | Gatekeeper Secure Workspace",
  description: "Private local dashboard.",
};

export default async function DashboardPage() {
  const session = await getIronSession();

  if (!session?.user?.isLoggedIn || !session?.user?.id) {
    redirect("/login");
  }

  // Fetch the full details from the database
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!dbUser) {
    // If the user database record is missing, destroy session and redirect
    session.destroy();
    redirect("/login");
  }

  return (
    <div className="auth-page-container">
      <div className="auth-card" style={{ display: "flex", flexDirection: "column", padding: "4rem", justifyContent: "center", alignItems: "center", width: "100vw", height: "100vh", boxSizing: "border-box", background: "linear-gradient(135deg, #090d16 0%, #1e1b4b 60%, #312e81 100%)", color: "#ffffff" }}>
        <div style={{ maxWidth: "500px", width: "100%", textAlign: "center", display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          <h1 style={{ fontSize: "3rem", fontWeight: "700", background: "linear-gradient(to right, #ffffff, #c7d2fe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.03em" }}>
            Gatekeeper Access Granted
          </h1>
          
          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", padding: "2.5rem", borderRadius: "1.25rem", backdropFilter: "blur(12px)", textAlign: "left", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <p style={{ color: "#06b6d4", fontSize: "0.8rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1.5px" }}>Active Session Verified</p>
            <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "0.25rem 0" }} />
            <p style={{ fontSize: "1.2rem", fontWeight: "500" }}>Name: <span style={{ color: "#a5b4fc" }}>{dbUser.name}</span></p>
            <p style={{ fontSize: "1.2rem", fontWeight: "500" }}>Email: <span style={{ color: "#a5b4fc" }}>{dbUser.email}</span></p>
            <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "0.25rem 0" }} />
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>User Token Reference: {dbUser.id}</p>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="auth-submit-btn" style={{ background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", maxWidth: "220px", margin: "0 auto", borderRadius: "0.75rem", padding: "1rem" }}>
              Secure Log Out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
