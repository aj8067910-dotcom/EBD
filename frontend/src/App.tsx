import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing.js';
import { Join } from './pages/Join.js';
import { StudentRoom } from './pages/StudentRoom.js';
import { Placeholder } from './pages/Placeholder.js';
import { RequireAuth } from './pages/teacher/RequireAuth.js';

// Teacher pages are lazy-loaded so the student bundle stays lean (Recharts,
// dnd-kit, react-hook-form and qrcode are teacher-only).
const TeacherLogin = lazy(() =>
  import('./pages/teacher/TeacherLogin.js').then((m) => ({ default: m.TeacherLogin })),
);
const Dashboard = lazy(() =>
  import('./pages/teacher/Dashboard.js').then((m) => ({ default: m.Dashboard })),
);
const LessonEditor = lazy(() =>
  import('./pages/teacher/LessonEditor.js').then((m) => ({ default: m.LessonEditor })),
);
const LivePanel = lazy(() =>
  import('./pages/teacher/LivePanel.js').then((m) => ({ default: m.LivePanel })),
);
const Report = lazy(() =>
  import('./pages/teacher/Report.js').then((m) => ({ default: m.Report })),
);

function Loading() {
  return <div className="p-8 text-center text-muted">Carregando…</div>;
}

/**
 * Application routes. Student flow (PARTE 4) + teacher panel (PARTE 5).
 * Projector mode (/screen) and pre-class form land in PARTE 6.
 */
export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/join" element={<Join />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/room/:code" element={<StudentRoom />} />

        <Route path="/teacher/login" element={<TeacherLogin />} />
        <Route element={<RequireAuth />}>
          <Route path="/teacher" element={<Dashboard />} />
          <Route path="/teacher/lessons/:id" element={<LessonEditor />} />
          <Route path="/teacher/live/:code" element={<LivePanel />} />
          <Route path="/teacher/rooms/:id/report" element={<Report />} />
        </Route>

        <Route
          path="/screen/:code"
          element={<Placeholder title="Modo Projetor" part="PARTE 6" />}
        />
        <Route
          path="/preclass/:token"
          element={<Placeholder title="Pré-aula" part="PARTE 6" />}
        />

        <Route path="*" element={<Placeholder title="Página não encontrada" />} />
      </Routes>
    </Suspense>
  );
}
