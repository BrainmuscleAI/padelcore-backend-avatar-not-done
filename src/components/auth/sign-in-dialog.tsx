import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { SignInForm } from './sign-in-form';
import { useState } from 'react';
import '@/components/ui/animations.css';

interface SignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SignInDialog({ open, onOpenChange }: SignInDialogProps) {
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
          <DialogTitle>Iniciar Sesión</DialogTitle>
          <DialogDescription>
            Ingresa tus credenciales para acceder a tu cuenta
          </DialogDescription>
        </DialogHeader>
        <SignInForm 
          onSuccess={() => onOpenChange(false)}
          onSubmitStart={() => setIsAnimating(true)}
          onSubmitEnd={() => setIsAnimating(false)}
          onError={handleError}
        />
      </DialogContent>
    </Dialog>
  );
}