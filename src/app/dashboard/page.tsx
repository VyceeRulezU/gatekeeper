import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
  const sessionContext = await getSession();

  // Guard: if session is invalid or user is locked, redirect to login
  if (!sessionContext) {
    redirect('/login');
  }

  return <DashboardClient />;
}
