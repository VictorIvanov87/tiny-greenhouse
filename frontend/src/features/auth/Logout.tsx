import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner } from 'flowbite-react';
import { useAuth } from './hooks/useAuth';

const Logout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  useEffect(() => {
    let active = true;

    const execute = async () => {
      try {
        await signOut();
      } catch (error) {
        console.error('Sign out failed', error);
      } finally {
        if (active) {
          navigate('/login', { replace: true });
        }
      }
    };

    void execute();

    return () => {
      active = false;
    };
  }, [navigate, signOut]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center bg-transparent">
      <div className="flex items-center gap-3 rounded-xl border border-[#1f2a3d] bg-[#111c2d] px-4 py-3 text-sm text-slate-300 shadow-[0_18px_48px_rgba(8,20,38,0.35)]">
        <Spinner size="sm" color="info" />
        <span>Signing you out…</span>
      </div>
    </div>
  );
};

export default Logout;
