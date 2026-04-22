import { getTenant } from '@/lib/tenant';
import LoginForm from '@/components/LoginForm';

/**
 * PÁGINA DE INICIO (SERVER COMPONENT)
 * Detecta el club dinámicamente basándose en el subdominio.
 */
export default async function LoginPage() {
  const tenant = await getTenant();

  return <LoginForm tenant={tenant} />;
}