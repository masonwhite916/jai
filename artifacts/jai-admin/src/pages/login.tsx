import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminLogin } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';

export default function Login() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  
  const loginMutation = useAdminLogin({
    mutation: {
      onSuccess: (data) => {
        localStorage.setItem('jai_admin_token', data.token);
        toast.success('Logged in successfully');
        setLocation('/dashboard');
      },
      onError: (_error) => {
        toast.error('Invalid credentials. Please try again.');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast.error('Password is required');
      return;
    }
    loginMutation.mutate({ data: { password } });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-4">
            <ShieldAlert className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">JAI Ops Center</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Enter the master control password to access the dispatch panel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="password">Access Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full"
              autoFocus
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? 'Authenticating...' : 'Gain Access'}
          </Button>
        </form>
        
        <p className="text-xs text-center text-muted-foreground mt-8">
          Authorized personnel only. All access is logged.
        </p>
      </div>
    </div>
  );
}
