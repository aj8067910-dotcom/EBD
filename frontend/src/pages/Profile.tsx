import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, useToast } from '../ui/index.js';
import { TeacherNav } from '../components/TeacherNav.js';
import { useProfile, useUpdatePreferences } from '../api/part10Hooks.js';

/** User profile: masked WhatsApp number + daily-reading preference. */
export function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data, isLoading, isError } = useProfile();
  const updatePrefs = useUpdatePreferences();

  const [name, setName] = useState('');
  const [dailyReading, setDailyReading] = useState(true);

  useEffect(() => {
    if (data?.profile) {
      setName(data.profile.name);
      setDailyReading(data.profile.preferences.dailyReadingEnabled);
    }
  }, [data]);

  useEffect(() => {
    if (isError) navigate('/teacher/login', { replace: true });
  }, [isError, navigate]);

  if (isLoading || !data) {
    return <div className="p-8 text-center text-muted">Carregando…</div>;
  }
  const profile = data.profile;

  const save = async () => {
    await updatePrefs.mutateAsync({ name, dailyReadingEnabled: dailyReading });
    toast('Preferências salvas', 'success');
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <TeacherNav active="profile" />
      <h1 className="mb-4 text-2xl font-extrabold uppercase text-ink">Meu perfil</h1>

      <Card className="flex flex-col gap-4">
        <label className="text-sm font-medium text-ink">
          Nome
          <input
            className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-surface px-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div>
          <p className="text-sm font-medium text-ink">Meu WhatsApp</p>
          <p className="font-mono text-lg text-muted">
            {profile.whatsappNumberMasked || '—'}
          </p>
          <p className="text-xs text-muted">
            Para alterar o número é necessária uma nova verificação por código.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-xl border border-line p-3 text-ink">
          <input
            type="checkbox"
            checked={dailyReading}
            onChange={(e) => setDailyReading(e.target.checked)}
          />
          <span>
            Receber leitura diária pelo WhatsApp
            <span className="block text-sm text-muted">
              Você pode desativar quando quiser.
            </span>
          </span>
        </label>

        <Button block disabled={updatePrefs.isPending} onClick={save}>
          {updatePrefs.isPending ? 'Salvando…' : 'Salvar preferências'}
        </Button>
      </Card>
    </div>
  );
}
