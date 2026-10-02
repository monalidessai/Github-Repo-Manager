import React from 'react';
import { ShieldCheck, GitBranch } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#E5E5E5] bg-white/90 backdrop-blur-md mt-auto py-6 text-xs text-[#6B6B6B] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-[#5A5A5A]">
          <GitBranch className="w-4 h-4 text-[#C5A880]" />
          <span className="font-serif font-bold text-[#1A1A1A]">PT Repo Manager</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-4 text-[#6B6B6B] font-medium">
          <span className="flex items-center gap-1.5 text-[#7D5E46] font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" /> SHA-256 Audit Log Enabled
          </span>
          <span>•</span>
          <span>GitHub API Live Integration</span>
        </div>
      </div>
    </footer>
  );
};
