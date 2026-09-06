import { useNavigate, useParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useReport } from '../../api/teacherHooks.js';
import { Button, Card, useToast } from '../../ui/index.js';
import { getToken } from '../../api/client.js';
import { API_URL } from '../../config.js';

interface MomentReport {
  id: string;
  type: string;
  title: string;
  answerCount: number;
  participationRate: number;
  accuracyBefore?: number;
  accuracyAfter?: number;
  gain?: number;
}

export function Report() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading } = useReport(id);

  const report = data?.report;

  const downloadCsv = async () => {
    try {
      const res = await fetch(`${API_URL}/rooms/${id}/report.csv`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: 'include',
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${report?.room?.code ?? id}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast('Falha ao exportar CSV', 'error');
    }
  };

  if (isLoading || !report) {
    return <div className="p-6 text-muted">Carregando relatório…</div>;
  }

  const peer: MomentReport[] = report.moments.filter(
    (m: MomentReport) => m.type === 'PEER_INSTRUCTION',
  );
  const unanswered = report.wall.filter((w: { answered: boolean }) => !w.answered);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/teacher')}>
          ← Painel
        </Button>
        <Button onClick={downloadCsv}>Exportar CSV</Button>
      </div>

      <h1 className="text-2xl font-bold text-ink">Relatório da aula</h1>
      <p className="mb-5 text-muted">
        {report.lesson.title} · Sala {report.room.code} · {report.participantCount}{' '}
        participante(s)
      </p>

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold text-ink">Participação por momento</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {report.moments.map((m: MomentReport) => (
            <li key={m.id} className="flex justify-between">
              <span className="text-ink">{m.title}</span>
              <span className="text-muted">
                {m.answerCount} · {Math.round(m.participationRate * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {peer.length > 0 && (
        <Card className="mb-4">
          <h2 className="mb-2 font-semibold text-ink">
            Ganho de aprendizagem (Peer Instruction)
          </h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={peer.map((m) => ({
                name: m.title,
                Antes: Math.round((m.accuracyBefore ?? 0) * 100),
                Depois: Math.round((m.accuracyAfter ?? 0) * 100),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis unit="%" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Antes" fill="var(--muted)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Depois" fill="var(--ok)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="mb-4">
        <h2 className="mb-2 font-semibold text-ink">Reflexões</h2>
        {report.reflections.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma reflexão registrada.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {report.reflections.map(
              (r: { text: string; nickname: string | null }, i: number) => (
                <li key={i} className="text-ink">
                  “{r.text}” <span className="text-muted">— {r.nickname ?? 'Anônimo'}</span>
                </li>
              ),
            )}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="mb-2 font-semibold text-ink">
          Dúvidas não respondidas (para a próxima aula)
        </h2>
        {unanswered.length === 0 ? (
          <p className="text-sm text-muted">Todas as dúvidas foram respondidas. 🎉</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {unanswered.map((w: { text: string; upvotes: number }, i: number) => (
              <li key={i} className="flex justify-between text-ink">
                <span>{w.text}</span>
                <span className="text-muted">👍 {w.upvotes}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
