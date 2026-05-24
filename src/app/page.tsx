import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function HomePage() {
  const sessionContext = await getSession();

  if (sessionContext) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
