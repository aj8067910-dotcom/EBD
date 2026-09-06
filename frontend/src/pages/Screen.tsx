import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { useRoomStore } from '../store/useRoomStore.js';
import { connectScreen, disconnectSocket } from '../realtime/socket.js';
import { Timer } from '../ui/index.js';
import { ScreenRenderer } from '../moments/screen/ScreenRenderer.js';

export function Screen() {
  const { code = '' } = useParams();

  const connected = useRoomStore((s) => s.connected);
  const roomState = useRoomStore((s) => s.roomState);
  const activeMoment = useRoomStore((s) => s.activeMoment);
  const phase = useRoomStore((s) => s.phase);
  const results = useRoomStore((s) => s.results);
  const answeredCount = useRoomStore((s) => s.answeredCount);
  const participantCount = useRoomStore((s) => s.participantCount);
  const timer = useRoomStore((s) => s.timer);
  const scores = useRoomStore((s) => s.scores);
  const wall = useRoomStore((s) => s.wall);

  useEffect(() => {
    document.documentElement.classList.add('dark');
    connectScreen(code);

    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => undefined);
      }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('dark');
      disconnectSocket();
    };
  }, [code]);

  const joinUrl = `${window.location.origin}/join/${code}`;
  const showTimer = !!timer?.running;

  return (
    <div className="flex min-h-screen flex-col bg-bg text-ink">
      {/* Top bar: room code + QR + participants + scoreboard */}
      <header className="flex items-center justify-between gap-6 p-6">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-surface p-2">
            <QRCodeSVG value={joinUrl} size={88} />
          </div>
          <div>
            <p className="text-lg text-muted">Entre em {window.location.host}/join</p>
            <p className="font-mono text-6xl font-black tracking-widest text-brand">
              {code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {showTimer && timer && (
            <Timer remaining={timer.remaining} total={timer.total} label={timer.label} />
          )}
          <div className="text-right">
            <p className="text-5xl font-bold text-ink">{participantCount}</p>
            <p className="text-lg text-muted">participantes</p>
          </div>
        </div>
      </header>

      {scores.length > 0 && (
        <div className="flex flex-wrap justify-center gap-3 px-6 pb-2">
          {scores.map((t) => (
            <span
              key={t.id}
              className="rounded-full px-4 py-1 text-xl font-bold text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.name}: {t.score}
            </span>
          ))}
        </div>
      )}

      {!connected && (
        <div className="bg-accent-soft py-1 text-center text-sm text-ink">
          Reconectando…
        </div>
      )}

      {/* Main stage */}
      <main className="flex flex-1 items-center justify-center p-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMoment ? `${activeMoment.id}:${phase}` : 'waiting'}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="flex w-full items-center justify-center"
          >
            {activeMoment ? (
              <ScreenRenderer
                moment={activeMoment}
                phase={phase}
                results={results}
                answeredCount={answeredCount}
                timer={timer}
                wall={wall}
              />
            ) : (
              <div className="text-center">
                <h1 className="text-6xl font-black text-ink">
                  {roomState?.lessonTitle ?? 'Koinonia Class'}
                </h1>
                <p className="mt-6 text-3xl text-muted">
                  Entre em {window.location.host}/join com o código{' '}
                  <span className="font-mono font-bold text-brand">{code}</span>
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
