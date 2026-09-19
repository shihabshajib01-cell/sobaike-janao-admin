import React, { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';

type MfaMode = 'loading' | 'enroll' | 'challenge' | 'ready';

export const AdminMfaGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout } = useAuth();
  const { language } = useLanguage();
  const [mode, setMode] = useState<MfaMode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const bn = language === 'bn';

  const prepareMfa = useCallback(async () => {
    setError('');
    setMode('loading');

    const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal.error) {
      setError(aal.error.message);
      setMode('challenge');
      return;
    }

    if (aal.data.currentLevel === 'aal2') {
      setMode('ready');
      return;
    }

    const factors = await supabase.auth.mfa.listFactors();
    if (factors.error) {
      setError(factors.error.message);
      setMode('challenge');
      return;
    }

    const verifiedTotp = factors.data.totp.find((factor) => factor.status === 'verified');
    if (verifiedTotp) {
      setFactorId(verifiedTotp.id);
      setMode('challenge');
      return;
    }

    const allFactors = 'all' in factors.data && Array.isArray(factors.data.all)
      ? factors.data.all
      : [];
    const staleTotp = allFactors.filter(
      (factor: any) => factor.factor_type === 'totp' && factor.status !== 'verified'
    );

    for (const factor of staleTotp) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id }).catch(() => undefined);
    }

    const enrollment = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'Sobaike Janao Admin',
    });

    if (enrollment.error) {
      setError(enrollment.error.message);
      setMode('challenge');
      return;
    }

    setFactorId(enrollment.data.id);
    setQrCode(enrollment.data.totp.qr_code);
    setSecret(enrollment.data.totp.secret);
    setMode('enroll');
  }, []);

  useEffect(() => {
    void prepareMfa();
  }, [prepareMfa]);

  const verify = async () => {
    const cleanCode = code.trim();
    if (!/^\d{6,10}$/.test(cleanCode) || !factorId) {
      setError(bn ? 'অথেন্টিকেটর অ্যাপের কোড দিন।' : 'Enter the code from your authenticator app.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verification = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: cleanCode,
      });
      if (verification.error) throw verification.error;

      await supabase.auth.refreshSession();
      const aal = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal.error || aal.data.currentLevel !== 'aal2') {
        throw aal.error || new Error('MFA verification did not elevate the session.');
      }

      setCode('');
      setMode('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'MFA verification failed.');
    } finally {
      setBusy(false);
    }
  };

  if (mode === 'ready') return <>{children}</>;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {bn ? 'অ্যাডমিন নিরাপত্তা যাচাই' : 'Admin security verification'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {bn ? 'অ্যাডমিন প্যানেলে প্রবেশ করতে দুই ধাপের যাচাই সম্পন্ন করুন।' : 'Complete two-factor authentication to enter the admin workspace.'}
            </p>
          </div>
        </div>

        {mode === 'loading' ? (
          <p className="text-sm text-muted-foreground" role="status">
            {bn ? 'নিরাপত্তা যাচাই হচ্ছে…' : 'Checking security status…'}
          </p>
        ) : (
          <div className="space-y-4">
            {mode === 'enroll' && (
              <>
                <p className="text-sm text-foreground">
                  {bn ? 'Google Authenticator, Microsoft Authenticator বা অন্য TOTP অ্যাপ দিয়ে QR কোড স্ক্যান করুন।' : 'Scan this QR code with Google Authenticator, Microsoft Authenticator, or another TOTP app.'}
                </p>
                {qrCode && (
                  <div className="flex justify-center rounded-xl bg-white p-4 border border-border">
                    <img src={qrCode} alt={bn ? 'MFA QR কোড' : 'MFA QR code'} className="w-48 h-48" />
                  </div>
                )}
                {secret && (
                  <p className="text-xs text-muted-foreground break-all">
                    {bn ? 'ম্যানুয়াল কোড: ' : 'Manual setup key: '}
                    <span className="font-mono text-foreground">{secret}</span>
                  </p>
                )}
              </>
            )}

            {mode === 'challenge' && (
              <p className="text-sm text-foreground">
                {bn ? 'আপনার অথেন্টিকেটর অ্যাপে দেখানো কোডটি দিন।' : 'Enter the current code shown in your authenticator app.'}
              </p>
            )}

            <Input
              id="admin-mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              label={bn ? 'ভেরিফিকেশন কোড' : 'Verification code'}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
              error={error || undefined}
              disabled={busy}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={verify} disabled={busy || mode === 'loading'} className="flex-1">
                {busy ? (bn ? 'যাচাই হচ্ছে…' : 'Verifying…') : (bn ? 'যাচাই করুন' : 'Verify')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void logout()}
                disabled={busy}
               
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                {bn ? 'লগ আউট' : 'Sign out'}
              </Button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default AdminMfaGate;
