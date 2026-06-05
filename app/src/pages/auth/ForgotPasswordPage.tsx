import { useState } from "react";
import { Flag, ArrowLeft, MailCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";

export function ForgotPasswordPage() {
  const { forgotPassword, isLoading, error, successMessage } = useAuth();
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    forgotPassword(email);
  }

  // Tampilan sukses setelah email terkirim
  if (successMessage) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
            <MailCheck className="h-6 w-6 text-green-700" />
          </div>
          <CardTitle className="text-xl">Email Terkirim</CardTitle>
          <CardDescription>{successMessage}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-center text-sm text-zinc-500">
            Cek inbox atau folder spam kamu. Link reset berlaku selama 30 menit.
          </p>
          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm font-medium text-green-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke halaman masuk
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-700">
          <Flag className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-xl">Lupa Password</CardTitle>
        <CardDescription>
          Masukkan email kamu dan kami akan mengirimkan link untuk reset password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" error={error} required>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </FormField>

          <Button type="submit" className="w-full" loading={isLoading}>
            Kirim Link Reset
          </Button>

          <Link
            to="/login"
            className="flex items-center justify-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke halaman masuk
          </Link>
        </form>
      </CardContent>
    </Card>
  );
}
