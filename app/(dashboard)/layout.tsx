import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import BottomNav from "@/components/ui/bottom-nav";
import Sidebar from "@/components/ui/sidebar";
import { prisma } from "@/lib/db";

async function getUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session) return null;
  const lastDot = session.value.lastIndexOf(".");
  if (lastDot === -1) return null;
  const value = session.value.slice(0, lastDot);
  const userId = parseInt(value, 10);
  return isNaN(userId) ? null : userId;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userId = await getUserId();
  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompleted: true },
    });
    if (user && !user.onboardingCompleted) {
      redirect("/onboarding");
    }
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
