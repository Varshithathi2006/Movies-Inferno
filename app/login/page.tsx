// app/login/page.tsx
"use client";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      const session = await getSession();
      if (session) {
        router.push("/");
      }
    };
    checkSession();
  }, [router]);

  const handleLogin = async () => {
    await signIn("azure-ad-b2c", { callbackUrl: "/" });
  };

  return (
    <div className="flex justify-center items-center h-screen bg-black">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg w-96 text-white">
        <h2 className="text-2xl font-bold mb-6 text-center">Welcome to Movies Inferno</h2>
        <p className="text-gray-300 mb-6 text-center">
          Sign in with your Microsoft account to access your personalized movie experience.
        </p>
        <button 
          onClick={handleLogin}
          className="w-full bg-blue-600 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          Sign in with Microsoft
        </button>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Secure authentication powered by Azure AD B2C
          </p>
        </div>
      </div>
    </div>
  );
}