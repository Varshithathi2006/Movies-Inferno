// app/signup/page.tsx
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const router = useRouter();

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Email is invalid";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          username: username
        }
      }
    });

    if (error) {
      setErrors({ general: error.message });
      setLoading(false);
    } else if (data.user) {
      // The user account is created. Now, let's update your custom 'users' table.
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({ 
          id: data.user.id, 
          email: data.user.email,
          username: username
        });
      
      if (userError) {
        setErrors({ general: userError.message });
      } else {
        alert("Account created successfully! Please check your email to confirm.");
        router.push("/");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-black p-4">
      <form 
        onSubmit={handleSignup} 
        className="bg-gray-900 p-8 rounded-2xl shadow-lg w-full max-w-md text-white"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
        
        {errors.general && (
          <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
            {errors.general}
          </div>
        )}

        <div className="mb-4">
          <input 
            type="text" 
            placeholder="Username" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            className={`w-full p-3 rounded bg-gray-800 border ${errors.username ? 'border-red-500' : 'border-gray-700'} focus:border-red-500 focus:outline-none`}
            disabled={loading}
          />
          {errors.username && (
            <p className="text-red-500 text-sm mt-1">{errors.username}</p>
          )}
        </div>

        <div className="mb-4">
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className={`w-full p-3 rounded bg-gray-800 border ${errors.email ? 'border-red-500' : 'border-gray-700'} focus:border-red-500 focus:outline-none`}
            disabled={loading}
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div className="mb-4">
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className={`w-full p-3 rounded bg-gray-800 border ${errors.password ? 'border-red-500' : 'border-gray-700'} focus:border-red-500 focus:outline-none`}
            disabled={loading}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        <div className="mb-6">
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            className={`w-full p-3 rounded bg-gray-800 border ${errors.confirmPassword ? 'border-red-500' : 'border-gray-700'} focus:border-red-500 focus:outline-none`}
            disabled={loading}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
          )}
        </div>

        <button 
          type="submit" 
          className="w-full bg-red-600 py-3 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          disabled={loading}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>

        <p className="text-center text-gray-400 mt-4 text-sm">
          Already have an account?{" "}
          <a href="/login" className="text-red-500 hover:text-red-400">
            Sign In
          </a>
        </p>
      </form>
    </div>
  );
}