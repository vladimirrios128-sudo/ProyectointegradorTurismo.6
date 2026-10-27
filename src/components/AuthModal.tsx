import React, { FormEvent, useEffect, useState } from 'react';
import { X, Compass, Loader2, Eye, EyeOff } from 'lucide-react';
import { authenticate, registerAccount } from '../utils/auth';
import { UserSession } from '../utils/rbac';

const EMAIL_PATTERN = /^(?!.*--)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

const isValidEmail = (email: string) => email.length <= 100 && EMAIL_PATTERN.test(email);

const passwordChecks = (password: string) => ({
  length: password.length >= 8 && password.length <= 64 && new TextEncoder().encode(password).length <= 72,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /\d/.test(password),
  special: /[@$!%*?&]/.test(password),
});

interface AuthModalProps {
  onClose: () => void;
  onAuthenticated: (token: string, user: UserSession) => void;
}

type AuthTab = 'login' | 'register';

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onAuthenticated }) => {
  const [tab, setTab] = useState<AuthTab>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  useEffect(() => {
    const bodyAlreadyLocked = document.body.classList.contains('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    return () => {
      if (!bodyAlreadyLocked) document.body.classList.remove('overflow-hidden');
    };
  }, []);

  const registrationPasswordChecks = passwordChecks(registerPassword);
  const registrationPasswordIsValid = Object.values(registrationPasswordChecks).every(Boolean);
  const registrationPasswordRequirements: Array<{ valid: boolean; label: string }> = [
    { valid: registrationPasswordChecks.length, label: 'Entre 8 y 64 caracteres' },
    { valid: registrationPasswordChecks.uppercase, label: 'Una letra mayúscula' },
    { valid: registrationPasswordChecks.lowercase, label: 'Una letra minúscula' },
    { valid: registrationPasswordChecks.number, label: 'Un número' },
    { valid: registrationPasswordChecks.special, label: 'Un carácter especial (@$!%*?&)' },
  ];

  const finishLogin = async (email: string, password: string) => {
    const session = await authenticate(email, password);
    onAuthenticated(session.token, session.user);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    if (!isValidEmail(email) || new TextEncoder().encode(password).length > 72) {
      setErrorMessage('Verifica el correo y que la contraseña no supere el límite permitido.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await finishLogin(email, password);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') || '');
    const password = String(form.get('password') || '');
    if (!isValidEmail(email)) {
      setErrorMessage('Ingresa un correo válido de hasta 100 caracteres.');
      return;
    }
    if (!Object.values(passwordChecks(password)).every(Boolean)) {
      setErrorMessage('La contraseña no cumple los requisitos indicados.');
      return;
    }
    let accountCreated = false;
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await registerAccount({
        email,
        full_name: String(form.get('full_name') || '').trim(),
        password,
        role: form.get('role') === 'Comerciante' ? 'Comerciante' : 'Turista',
      });
      accountCreated = true;
      await finishLogin(email, password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo crear la cuenta.';
      setErrorMessage(accountCreated
        ? `La cuenta fue creada, pero no se pudo iniciar sesión. ${message}`
        : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchTab = (nextTab: AuthTab) => {
    setTab(nextTab);
    setErrorMessage('');
  };

  return (
    <div
    className="fixed inset-0 z-[100] grid max-h-screen place-items-center overflow-y-auto bg-[#05080c]/75 p-4 backdrop-blur-xl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-[24px] border border-[#E67E22]/25 bg-[#141b24]/90 p-6 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#E67E22]">
              <Compass className="h-4 w-4" />
              Turismo Colombia
            </div>
            <h2 id="auth-title" className="font-display text-2xl font-bold text-[#F8F6F0]">
              {tab === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta'}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">
              {tab === 'login' ? 'Inicia sesión para continuar tu viaje.' : 'Únete a nuestra comunidad viajera.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-neutral-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1" role="tablist" aria-label="Acceso a la cuenta">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            onClick={() => switchTab('login')}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${tab === 'login' ? 'bg-gradient-to-r from-[#E67E22]/30 to-[#D4AF37]/15 text-white shadow-inner shadow-[#E67E22]/10' : 'text-neutral-400 hover:text-white'}`}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            onClick={() => switchTab('register')}
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${tab === 'register' ? 'bg-gradient-to-r from-[#E67E22]/30 to-[#D4AF37]/15 text-white shadow-inner shadow-[#E67E22]/10' : 'text-neutral-400 hover:text-white'}`}
          >
            Registrarse
          </button>
        </div>

        {tab === 'login' ? (
          <form className="space-y-4" onSubmit={handleLogin}>
            <label className="block text-sm font-medium text-neutral-300">
              Email o usuario
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={100}
                pattern="(?!.*--)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                required
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#E67E22] focus:ring-2 focus:ring-[#E67E22]/15"
                placeholder="tu@correo.com"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-300">
              Contraseña
              <div className="relative mt-1.5">
                <input
                  name="password"
                  type={showLoginPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  maxLength={72}
                  required
                  value={loginPassword}
                  onChange={(event) => setLoginPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-neutral-600 focus:border-[#E67E22] focus:ring-2 focus:ring-[#E67E22]/15"
                  placeholder="Tu contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400 transition hover:text-white"
                  aria-label={showLoginPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showLoginPassword}
                >
                  {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {loginEmail.length > 0 && !isValidEmail(loginEmail) && (
              <p className="text-xs text-red-300" role="alert">Ingresa un correo válido de hasta 100 caracteres.</p>
            )}
            {errorMessage && <p className="text-sm text-red-300" role="alert">{errorMessage}</p>}
            <button
              type="submit"
              disabled={isSubmitting || !isValidEmail(loginEmail) || loginPassword.length === 0 || new TextEncoder().encode(loginPassword).length > 72}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E67E22] to-[#D35400] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#E67E22]/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Iniciar Sesión
            </button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={handleRegister}>
            <label className="block text-sm font-medium text-neutral-300">
              Nombre completo
              <input
                name="full_name"
                type="text"
                minLength={2}
                maxLength={100}
                autoComplete="name"
                required
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-4 py-3 text-sm text-white outline-none focus:border-[#E67E22] focus:ring-2 focus:ring-[#E67E22]/15"
              />
            </label>
            <label className="block text-sm font-medium text-neutral-300">
              Correo electrónico
              <input
                name="email"
                type="email"
                autoComplete="email"
                maxLength={100}
                pattern="(?!.*--)[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
                required
                value={registerEmail}
                onChange={(event) => setRegisterEmail(event.target.value)}
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-4 py-3 text-sm text-white outline-none focus:border-[#E67E22] focus:ring-2 focus:ring-[#E67E22]/15"
              />
              {registerEmail.length > 0 && !isValidEmail(registerEmail) && (
                <span className="mt-1 block text-xs text-red-300" role="alert">Ingresa un correo válido de hasta 100 caracteres.</span>
              )}
            </label>
            <label className="block text-sm font-medium text-neutral-300">
              Contraseña (8 a 64 caracteres)
              <div className="relative mt-1.5">
                <input
                  name="password"
                  type={showRegisterPassword ? 'text' : 'password'}
                  minLength={8}
                  maxLength={64}
                  autoComplete="new-password"
                  required
                  value={registerPassword}
                  onChange={(event) => setRegisterPassword(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-4 py-3 pr-12 text-sm text-white outline-none focus:border-[#E67E22] focus:ring-2 focus:ring-[#E67E22]/15"
                />
                <button
                  type="button"
                  onClick={() => setShowRegisterPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400 transition hover:text-white"
                  aria-label={showRegisterPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={showRegisterPassword}
                >
                  {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-xs" aria-label="Requisitos de contraseña">
                {registrationPasswordRequirements.map(({ valid, label }) => (
                  <li key={label} className={valid ? 'text-emerald-300' : 'text-neutral-400'}>
                    {valid ? '✓' : '•'} {label}
                  </li>
                ))}
              </ul>
            </label>
            <label className="block text-sm font-medium text-neutral-300">
              Tipo de cuenta
              <select
                name="role"
                defaultValue="Turista"
                className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#0c1017]/80 px-4 py-3 text-sm text-white outline-none focus:border-[#E67E22] focus:ring-2 focus:ring-[#E67E22]/15"
              >
                <option value="Turista">Turista</option>
                <option value="Comerciante">Comerciante</option>
              </select>
            </label>
            {errorMessage && <p className="text-sm text-red-300" role="alert">{errorMessage}</p>}
            <button
              type="submit"
              disabled={isSubmitting || !isValidEmail(registerEmail) || !registrationPasswordIsValid}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E67E22] to-[#D35400] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#E67E22]/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear Cuenta
            </button>
          </form>
        )}

        <p className="mt-5 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
          Acceso protegido con control de roles
        </p>
      </section>
    </div>
  );
};
