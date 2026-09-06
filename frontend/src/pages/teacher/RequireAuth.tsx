import { Navigate, Outlet } from 'react-router-dom';
import { useMe } from '../../api/teacherHooks.js';

/** Route guard: requires a valid teacher session, else redirects to login. */
export function RequireAuth() {
  const { data, isLoading, isError } = useMe();

  if (isLoading) {
    return (
      <div className="flex min-h-full items-center justify-center p-8 text-muted">
        Carregando…
      </div>
    );
  }
  if (isError || !data) {
    return <Navigate to="/teacher/login" replace />;
  }
  return <Outlet />;
}
