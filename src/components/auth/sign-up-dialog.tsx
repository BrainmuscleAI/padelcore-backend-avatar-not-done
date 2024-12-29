import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SignUpForm } from './sign-up-form';
import { useState } from 'react';
import '@/components/ui/animations.css';

interface SignUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignUpDialog({ open, onOpenChange }: SignUpDialogProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVibrating, setIsVibrating] = useState(false);

  const handleError = () => {
    setIsVibrating(true);
    setTimeout(() => setIsVibrating(false), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`sm:max-w-[425px] rainbow-border ${isAnimating ? 'animate' : ''} ${
          isVibrating ? 'vibrate' : ''
        }`}
      >
        <DialogHeader>
          <DialogTitle>Crear Cuenta</DialogTitle>
          <DialogDescription>
            Únete a la comunidad más grande de padel en México. Todos los campos son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <SignUpForm 
          onOpenChange={onOpenChange}
          onSubmitStart={() => setIsAnimating(true)}
          onSubmitEnd={() => setIsAnimating(false)}
          onError={handleError}
        />
      </DialogContent>
    </Dialog>
  );
}