import { getTenant } from '@/lib/tenant';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const tenant = await getTenant();
  
  return <LoginForm tenant={tenant} />;
}
