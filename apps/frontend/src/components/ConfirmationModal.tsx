import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  requiredTypedText?: string;
  danger?: boolean;
  loading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  requiredTypedText,
  danger = false,
  loading = false,
}) => {
  const [typedValue, setTypedValue] = useState('');

  const isMatch = requiredTypedText ? typedValue === requiredTypedText : true;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isMatch && !loading) {
      onConfirm();
      setTypedValue('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md border-[#E5E5E5] bg-white text-[#1A1A1A] shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 font-semibold">
            {danger && <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />}
            <DialogTitle className="text-[#1A1A1A]">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-[#6B6B6B] pt-1">
            {description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {requiredTypedText && (
            <div className="space-y-2 bg-[#F5EFE6] p-3 rounded-lg border border-[#E8DBCB]">
              <label className="block text-xs font-semibold text-[#1A1A1A]">
                Type <span className="font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{requiredTypedText}</span> to confirm:
              </label>
              <Input
                type="text"
                value={typedValue}
                onChange={(e) => setTypedValue(e.target.value)}
                placeholder={requiredTypedText}
                className="font-mono bg-white border-[#E5E5E5] text-[#1A1A1A] focus:border-rose-700 focus:ring-rose-700/20"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={danger ? 'destructive' : 'gold'}
              disabled={!isMatch || loading}
              className="gap-2"
            >
              {loading ? 'Processing...' : confirmText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
