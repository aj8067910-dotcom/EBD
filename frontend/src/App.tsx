import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing.js';
import { Join } from './pages/Join.js';
import { StudentRoom } from './pages/StudentRoom.js';
import { Placeholder } from './pages/Placeholder.js';

/**
 * Application routes. Student flow (Landing, Join, Room) is implemented in
 * PARTE 4; teacher and projector routes are placeholders until PARTE 5–6.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join" element={<Join />} />
      <Route path="/join/:code" element={<Join />} />
      <Route path="/room/:code" element={<StudentRoom />} />

      <Route
        path="/teacher/login"
        element={<Placeholder title="Login do Professor" part="PARTE 5" />}
      />
      <Route
        path="/teacher"
        element={<Placeholder title="Painel do Professor" part="PARTE 5" />}
      />
      <Route
        path="/teacher/lessons/:id"
        element={<Placeholder title="Editor de Roteiro" part="PARTE 5" />}
      />
      <Route
        path="/teacher/live/:code"
        element={<Placeholder title="Painel ao Vivo" part="PARTE 5" />}
      />
      <Route
        path="/screen/:code"
        element={<Placeholder title="Modo Projetor" part="PARTE 6" />}
      />
      <Route
        path="/preclass/:token"
        element={<Placeholder title="Pré-aula" part="PARTE 5" />}
      />

      <Route path="*" element={<Placeholder title="Página não encontrada" />} />
    </Routes>
  );
}
