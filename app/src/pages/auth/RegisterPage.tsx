import { useState } from "react";
import { Flag } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";

export function RegisterPage() {
  const { register, isLoading, error } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    register(name, email, password);
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-700">
          <Flag className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-xl">Buat Akun</CardTitle>
        <CardDescription>Daftar sebagai player</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Nama Lengkap" required>
            <Input
              id="name"
              placeholder="Nama kamu"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              autoFocus
            />
          </FormField>

          <FormField label="Email" required>
            <Input
              id="email"
              type="email"
              placeholder="nama@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </FormField>

          <FormField
            label="Password"
            hint="Min. 8 karakter, kombinasi huruf kapital & angka"
            required
          >
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </FormField>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" loading={isLoading}>
            Daftar
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Sudah punya akun?{" "}
            <Link to="/login" className="font-medium text-green-700 hover:underline">
              Masuk
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
