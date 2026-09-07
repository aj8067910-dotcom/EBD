import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input, useToast } from '../../ui/index.js';
import {
  useWhatsappRegister,
  useWhatsappRequest,
  useWhatsappVerify,
} from '../../api/part10Hooks.js';
import { ApiError } from '../../api/client.js';

/** Two-step WhatsApp OTP auth (login or first-access registration). */
export function WhatsAppLoginForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'number' | 'code'>('number');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [code, setCode] = useState('');

  const requestOtp = useWhatsappRequest();
  const register = useWhatsappRegister();
  const verify = useWhatsappVerify();

  const sendCode = async () => {
    try {
      if (mode === 'register') {
        await register.mutateAsync({ name, whatsappNumber: number });
      } else {
        await requestOtp.mutateAsync(number);
      }
      setStep('code');
      toast('Código enviado pelo WhatsApp', 'success');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Falha ao enviar código', 'error');
    }
  };

  const confirm = async () => {
    try {
      const { user } = await verify.mutateAsync({ whatsappNumber: number, code });
      await qc.invalidateQueries({ queryKey: ['me'] });
      await qc.invalidateQueries({ queryKey: ['profile'] });
      // Students land on their profile; teachers/admins on the teacher panel.
      navigate(user.role === 'STUDENT' ? '/profile' : '/teacher', { replace: true });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Código inválido', 'error');
    }
  };

  if (step === 'code') {
    return (
      <div className="flex flex-col gap-4">
        <Input
          name="code"
          label="Código de 6 dígitos"
          inputMode="numeric"
          value={code}
          maxLength={6}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className="text-center text-2xl tracking-[0.5em]"
        />
        <Button size="lg" block disabled={code.length !== 6 || verify.isPending} onClick={confirm}>
          {verify.isPending ? 'Confirmando…' : 'Confirmar'}
        </Button>
        <Button variant="ghost" onClick={() => setStep('number')}>
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {mode === 'register' && (
        <Input
          name="name"
          label="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      <Input
        name="whatsapp"
        label="Número de WhatsApp"
        inputMode="tel"
        placeholder="+55 74 99999-9999"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
      />
      <Button
        size="lg"
        block
        disabled={number.length < 8 || requestOtp.isPending || register.isPending}
        onClick={sendCode}
      >
        Enviar código
      </Button>
      <button
        type="button"
        className="text-sm text-brand underline"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? 'Primeiro acesso? Cadastrar' : 'Já tenho conta'}
      </button>
    </div>
  );
}
