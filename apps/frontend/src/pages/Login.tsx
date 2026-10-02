import React from 'react';
import { useAuth } from '../context/AuthContext';
import { FolderGit2, ArrowRight, Github, Sparkles, Lock, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const errorParam = searchParams.get('error');

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 relative overflow-hidden bg-[#FAFAFA]">
      {/* Champagne gold ambient glow decorations */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-[#C5A880]/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="max-w-md w-full border-[#E5E5E5] bg-white/98 backdrop-blur-2xl shadow-2xl relative z-10 overflow-hidden">
        {/* Top gold bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#1A1A1A] via-[#C5A880] to-[#1A1A1A]" />

        <CardHeader className="text-center pb-4 pt-8">
          <div className="w-16 h-16 bg-[#1A1A1A] text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-stone-900/10 ring-1 ring-[#C5A880]/40">
            <FolderGit2 className="w-8 h-8 text-[#C5A880]" />
          </div>

          <Badge variant="gold" className="w-fit mx-auto mb-2 gap-1.5 py-1 px-3">
            <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
            Engineering Governance Platform
          </Badge>

          <CardTitle className="text-2xl sm:text-3xl font-serif font-bold text-[#1A1A1A] tracking-tight">
            PT Repo Manager
          </CardTitle>
          <CardDescription className="text-[#6B6B6B] text-xs mt-1 font-medium">
            Governance & Retention Lifecycle for Practical Test Repositories
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {errorParam && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
              {errorParam === 'unprovisioned'
                ? 'Authentication failed. Your GitHub user is not provisioned in the database. Please contact an administrator.'
                : 'Authentication failed. Please ensure your GitHub account has authorization.'}
            </div>
          )}

          <div className="bg-[#FAF9F6] p-4 rounded-xl text-left border border-[#E5E5E5] space-y-2.5 text-xs text-[#2C221E] font-medium">
            <div className="flex items-center gap-2 font-bold text-[#1A1A1A]">
              <ShieldCheck className="w-4 h-4 text-[#7D5E46]" />
              <span>Role-Based Engineering Controls</span>
            </div>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C5A880] shrink-0" />
              <span>Strict prefix isolation (manages <code className="font-mono text-[#5E4432] bg-[#F5EFE6] px-1 py-0.5 rounded border border-[#E8DBCB]">pt-*</code> repos)</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#A39281] shrink-0" />
              <span>Automated collaborator revocation & access cleanup</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7D5E46] shrink-0" />
              <span>SHA-256 tamper-evident append-only audit trail</span>
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex-col gap-3 pt-2 pb-8">
          <Button
            size="lg"
            variant="gradient"
            onClick={login}
            className="w-full gap-3 py-6 text-sm font-semibold rounded-xl shadow-md"
          >
            <Github className="w-5 h-5 text-[#C5A880]" />
            <span>Sign In with GitHub</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-[11px] text-[#A39281] text-center flex items-center justify-center gap-1.5 font-medium">
            <Lock className="w-3 h-3 text-[#C5A880]" />
            OAuth HTTP-only secure cookie session storage
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
