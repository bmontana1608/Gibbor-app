import { getTenant } from '@/lib/tenant';
import LoginForm from '@/components/LoginForm';

export default async function TenantLoginPage({ params }: any) {
  const { tenant: slug } = await params;
  const tenant = await getTenant(slug);
  
  return <LoginForm tenant={tenant} />;
}
