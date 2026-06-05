import { useState } from "react";
import { Flag } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";

export function LoginPage() {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(email, password);
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-700">
          <Flag className="h-6 w-6 text-white" />
        </div>
        <CardTitle className="text-xl">Masuk ke Live scoring Pondokcabe</CardTitle>
        <CardDescription>Masukkan email dan password kamu</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Email" required>
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

          <FormField label="Password" required>
            <div className="space-y-1">
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-white hover:underline"
                >
                  Lupa password?
                </Link>
              </div>
            </div>
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
            Masuk
          </Button>

          <p className="text-center text-sm text-white">
            Belum punya akun?{" "}
            <Link to="/register" className="font-medium text-white underline hover:text-white/80">
              Daftar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
