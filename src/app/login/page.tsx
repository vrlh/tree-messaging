import { LoginForm } from "@/components/auth/login-form";
import { APP_NAME } from "@/lib/constants";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold text-gray-900">{APP_NAME}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sign in to continue
        </p>
      </div>
      <LoginForm errorParam={error} />
    </div>
  );
}
