// app/signup/page.tsx
"use client";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SignupPage() {
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

  const handleSignup = async () => {
    await signIn("azure-ad-b2c", { callbackUrl: "/" });
  };
  return (
    <div className="flex justify-center items-center min-h-screen bg-black p-4">
      <div className="bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md text-white">
        <h2 className="text-2xl font-bold mb-6 text-center">Join Movies Inferno</h2>
        <p className="text-gray-300 mb-6 text-center">
          Create your account with Microsoft to start your personalized movie journey.
        </p>
        <button 
          onClick={handleSignup}
          className="w-full bg-blue-600 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          Sign up with Microsoft
        </button>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Secure authentication powered by Azure AD B2C
          </p>
        </div>
        <p className="text-center text-gray-400 mt-6 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-blue-500 hover:text-blue-400">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}