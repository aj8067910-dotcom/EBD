import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Card, Halftone, Input, StarCluster, useToast } from '../../ui/index.js';
import { useLogin } from '../../api/teacherHooks.js';
import { ApiError } from '../../api/client.js';

export function TeacherLogin() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();
  const login = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login.mutateAsync({ email, password });
      await qc.invalidateQueries({ queryKey: ['me'] });
      navigate('/teacher');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Falha no login', 'error');
    }
  };

  return (
    <div className="relative mx-auto flex min-h-full max-w-md flex-col justify-center gap-5 overflow-hidden p-6">
      <Halftone from="top-right" opacity={0.14} />
      <header className="relative text-center">
        <StarCluster className="mb-2 justify-center" />
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand">
          El Shaday
        </p>
        <h1 className="mt-1 text-3xl font-extrabold uppercase text-ink">
          Painel do Professor
        </h1>
        <p className="mt-1 text-muted">Entre para montar e conduzir a aula.</p>
      </header>
      <Card>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Input
            name="email"
            type="email"
            label="E-mail"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            name="password"
            type="password"
            label="Senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" size="lg" block disabled={login.isPending}>
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </Card>
      <p className="text-center text-xs text-muted">
        Demo: professor@koinonia.dev / demo1234
      </p>
    </div>
  );
}
