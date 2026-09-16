import LoginForm from '@/components/LoginForm';

export default function EmbajadorLoginPage() {
  const embajadorTenant = {
    slug: 'embajador',
    config: {
      nombre: 'Red de Embajadores',
      logo: '/mcm-logo.png',
      color: '#22c55e', 
    }
  };
  
  return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-50">
        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border border-green-500/30">
          Acceso Exclusivo
        </span>
      </div>
      <LoginForm tenant={embajadorTenant} />
    </div>
  );
}
