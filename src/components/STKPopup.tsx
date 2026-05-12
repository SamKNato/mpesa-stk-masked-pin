import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Fingerprint, Eye, EyeOff } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConfirmationMode = 'standard' | 'masked' | 'biometric';

export interface STKPopupProps {
  mode: ConfirmationMode;
  merchant?: string;
  amount?: number;
  phone?: string;
  accountRef?: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PINBoxesProps {
  pin: string;
  mode: ConfirmationMode;
  isActive: boolean;
  maxLength: number;
  onClick: () => void;
}

/**
 * Visual PIN entry boxes — the core of this proposal's demo.
 *
 * In "standard" mode: renders pin[i] as plain text (digits visible).
 * In "masked" mode:   renders ● immediately, no digit ever shown.
 * In "biometric" mode: renders ● with a fingerprint accent.
 */
function PINBoxes({ pin, mode, isActive, maxLength, onClick }: PINBoxesProps) {
  return (
    <div
      className="flex gap-1.5 justify-center cursor-text"
      onClick={onClick}
      role="button"
      aria-label="PIN entry field — click to type"
    >
      {Array.from({ length: maxLength }).map((_, i) => {
        const char      = pin[i];
        const isFilled  = i < pin.length;
        const isCurrent = isActive && i === pin.length;
        const showChar  = isFilled && mode === 'standard';

        return (
          <div
            key={i}
            className={[
              'pin-box',
              isFilled  ? 'filled'  : '',
              isCurrent ? 'active'  : '',
            ].join(' ')}
            aria-hidden="true"
          >
            {isFilled ? (
              showChar ? (
                // ⚠️ SECURITY FLAW: digit is visible to anyone nearby
                <span className="text-slate-800 font-bold">{char}</span>
              ) : (
                // ✅ SECURE: immediately masked
                <span className="text-mpesa-green text-xl leading-none">●</span>
              )
            ) : (
              isCurrent && (
                <span className="w-0.5 h-5 bg-mpesa-green rounded-full animate-pulse inline-block" />
              )
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Simulated Android status bar at the top of the phone screen */
function StatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return (
    <div className="absolute top-10 left-0 right-0 flex justify-between items-center px-5 py-1 z-10">
      <span className="text-white text-xs font-semibold">{time}</span>
      <div className="flex items-center gap-1">
        {/* Signal bars */}
        <div className="flex items-end gap-0.5">
          {[3, 5, 7, 9].map((h, i) => (
            <div
              key={i}
              className="w-1 bg-white rounded-sm opacity-90"
              style={{ height: h }}
            />
          ))}
        </div>
        {/* WiFi icon */}
        <svg className="w-3 h-3 text-white fill-white ml-1" viewBox="0 0 24 24">
          <path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z" />
        </svg>
        {/* Battery */}
        <div className="flex items-center gap-0.5 ml-1">
          <div className="w-5 h-2.5 border border-white rounded-sm relative">
            <div className="absolute inset-0.5 right-1 bg-white rounded-sm" />
          </div>
          <div className="w-0.5 h-1.5 bg-white rounded-r-sm" />
        </div>
      </div>
    </div>
  );
}

/** Dimmed background wallpaper behind the dialog */
function PhoneWallpaper() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(160deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
      }}
    >
      <div className="absolute top-20 left-10 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
      <div className="absolute bottom-20 right-5 w-24 h-24 bg-mpesa-green/10 rounded-full blur-2xl" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function STKPopup({
  mode,
  merchant   = 'Carrefour Supermarket',
  amount     = 4847,
  phone      = '0712 345 678',
  accountRef = 'Order #4821',
}: STKPopupProps) {
  const [pin,          setPin]          = useState('');
  const [isFocused,    setIsFocused]    = useState(false);
  const [isSuccess,    setIsSuccess]    = useState(false);
  const [isError,      setIsError]      = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_PIN = 6;

  const formatted = new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2,
  }).format(amount);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, MAX_PIN);
    setPin(v);
    setIsError(false);
  }, []);

  const handleFocus = useCallback(() => setIsFocused(true),  []);
  const handleBlur  = useCallback(() => setIsFocused(false), []);

  const handleOK = useCallback(() => {
    if (pin.length < 4) {
      setIsError(true);
      setTimeout(() => setIsError(false), 1500);
      return;
    }
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setIsDialogOpen(false);
      setPin('');
      // Reopen after a beat for demo looping
      setTimeout(() => setIsDialogOpen(true), 800);
    }, 1800);
  }, [pin]);

  const handleCancel = useCallback(() => {
    setPin('');
    setIsDialogOpen(false);
    setTimeout(() => setIsDialogOpen(true), 600);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleOK();
    },
    [handleOK]
  );

  const isSecure = mode !== 'standard';

  const SecurityBadge = () => (
    <div className={`security-badge ${isSecure ? 'safe' : 'danger'}`}>
      {isSecure ? (
        <ShieldCheck className="w-3 h-3" strokeWidth={2.5} />
      ) : (
        <ShieldAlert className="w-3 h-3" strokeWidth={2.5} />
      )}
      <span>
        {mode === 'standard'  && 'PIN digits visible'}
        {mode === 'masked'    && 'PIN securely masked'}
        {mode === 'biometric' && 'Biometric auth'}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-4">

      {/* ── Phone Frame ─────────────────────────────────────────────────────── */}
      <div
        className="phone-frame shadow-phone"
        role="img"
        aria-label="M-Pesa STK Push dialog demo"
      >
        <PhoneWallpaper />
        <StatusBar />

        <div className="phone-screen">
          <AnimatePresence mode="wait">
            {isDialogOpen && (
              <motion.div
                key="dialog"
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={  { opacity: 0, scale: 0.88, y: 10  }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="mpesa-dialog"
              >
                {/* ── Dialog Header ──────────────────────────────────────── */}
                <div className="mpesa-dialog-header">
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center flex-shrink-0">
                      <span className="text-mpesa-green font-black text-xs leading-none">M</span>
                    </div>
                    <div>
                      <div className="mpesa-logo">M-PESA</div>
                      <div className="text-white/70 text-[9px] font-medium tracking-wide">
                        SAFARICOM
                      </div>
                    </div>
                  </div>
                  <div className="text-white/80">
                    {mode === 'masked'    && <EyeOff      className="w-4 h-4" />}
                    {mode === 'standard'  && <Eye         className="w-4 h-4" />}
                    {mode === 'biometric' && <Fingerprint className="w-4 h-4" />}
                  </div>
                </div>

                {/* ── Dialog Body ────────────────────────────────────────── */}
                <div className="px-4 pt-3 pb-1">

                  {/* Merchant */}
                  <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider mb-0.5">
                    Pay to
                  </p>
                  <p className="text-slate-800 font-semibold text-sm leading-tight mb-3 truncate">
                    {merchant}
                  </p>

                  {/* Amount */}
                  <div className="bg-mpesa-green-pale rounded-lg px-3 py-2 mb-3">
                    <p className="text-[10px] text-mpesa-green-dark font-medium uppercase tracking-wide">
                      Amount
                    </p>
                    <p className="text-mpesa-green-dark font-bold text-lg leading-tight">
                      {formatted}
                    </p>
                  </div>

                  {/* Meta rows */}
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Reference</span>
                      <span className="text-slate-600 font-semibold">{accountRef}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Phone</span>
                      <span className="text-slate-600 font-semibold">{phone}</span>
                    </div>
                  </div>

                  {/* ── PIN Section ──────────────────────────────────────── */}
                  <div className="border-t border-slate-100 pt-3 mb-2">
                    <p className="text-[11px] text-slate-500 font-medium text-center mb-2">
                      {mode === 'biometric'
                        ? 'Authenticate with fingerprint'
                        : 'Enter M-PESA PIN'}
                    </p>

                    {mode === 'biometric' ? (
                      /* Biometric mode — fingerprint prompt */
                      <motion.div
                        className="flex flex-col items-center gap-2 py-2"
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      >
                        <div className="w-14 h-14 bg-mpesa-green-pale rounded-full flex items-center justify-center">
                          <Fingerprint
                            className="w-8 h-8 text-mpesa-green"
                            strokeWidth={1.5}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">Touch the sensor</p>
                      </motion.div>
                    ) : (
                      /* Standard / Masked mode — PIN boxes */
                      <>
                        {/* Hidden real input — receives keystrokes */}
                        <input
                          ref={inputRef}
                          type={mode === 'standard' ? 'tel' : 'password'}
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="current-password"
                          value={pin}
                          onChange={handleChange}
                          onFocus={handleFocus}
                          onBlur={handleBlur}
                          onKeyDown={handleKeyDown}
                          maxLength={MAX_PIN}
                          className="sr-only"
                          aria-label={`M-PESA PIN — ${mode === 'masked' ? 'masked for security' : 'warning: digits visible'}`}
                        />

                        {/* Visual PIN boxes */}
                        <motion.div
                          animate={isError ? { x: [-4, 4, -4, 4, 0] } : {}}
                          transition={{ duration: 0.3 }}
                        >
                          <PINBoxes
                            pin={pin}
                            mode={mode}
                            isActive={isFocused}
                            maxLength={MAX_PIN}
                            onClick={focusInput}
                          />
                        </motion.div>

                        {isError && (
                          <p className="text-red-500 text-[10px] text-center mt-1.5 font-medium">
                            PIN must be at least 4 digits
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Warning only in standard mode */}
                  <AnimatePresence>
                    {mode === 'standard' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{   opacity: 0, height: 0 }}
                        className="bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 mb-2"
                      >
                        <p className="text-red-600 text-[9px] font-semibold text-center leading-snug">
                          ⚠️ Digits visible to nearby observers
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ── Success Overlay ───────────────────────────────────── */}
                <AnimatePresence>
                  {isSuccess && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{   opacity: 0 }}
                      className="absolute inset-0 bg-mpesa-green flex flex-col items-center justify-center gap-2 rounded-2xl"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center"
                      >
                        <ShieldCheck className="w-7 h-7 text-mpesa-green" strokeWidth={2.5} />
                      </motion.div>
                      <p className="text-white font-bold text-sm">Processing…</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Dialog Buttons ────────────────────────────────────── */}
                <div className="flex border-t border-slate-100">
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-3 text-slate-500 text-sm font-semibold hover:bg-slate-50
                               transition-colors duration-150 rounded-bl-2xl"
                  >
                    CANCEL
                  </button>
                  <div className="w-px bg-slate-100" />
                  <button
                    onClick={handleOK}
                    disabled={pin.length === 0 && mode !== 'biometric'}
                    className="flex-1 py-3 text-mpesa-green text-sm font-bold hover:bg-mpesa-green-pale
                               transition-colors duration-150 rounded-br-2xl disabled:opacity-40
                               disabled:cursor-not-allowed"
                  >
                    OK
                  </button>
                </div>
              </motion.div>
            )}

            {!isDialogOpen && (
              <motion.div
                key="closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white/30 text-xs text-center px-8"
              >
                Dialog closed — reopening…
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Security Status Badge (below phone) ─────────────────────────── */}
      <div className="flex flex-col items-center gap-2">
        <SecurityBadge />

        {mode === 'standard' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-500 text-xs text-center font-medium max-w-[200px] leading-snug"
          >
            Anyone nearby can read your PIN
          </motion.p>
        )}
        {mode === 'masked' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-mpesa-green-dark text-xs text-center font-medium max-w-[200px] leading-snug"
          >
            PIN hidden from all observers
          </motion.p>
        )}
        {mode === 'biometric' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-mpesa-green-dark text-xs text-center font-medium max-w-[200px] leading-snug"
          >
            No PIN typing required at all
          </motion.p>
        )}
      </div>
    </div>
  );
}
