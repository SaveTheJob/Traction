/* eslint-disable @typescript-eslint/no-explicit-any -- catch clauses and third-party config objects have no useful static type here */
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";

interface GoogleAuthButtonProps {
  label?: string;
  disabled?: boolean;
  onError?: (message: string) => void;
  setLoading?: (loading: boolean) => void;
}

export default function GoogleAuthButton({
  label = "Sign in with Google",
  disabled = false,
  onError,
  setLoading,
}: GoogleAuthButtonProps) {
  const navigate = useNavigate();

  const handleClick = async () => {
    setLoading?.(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      navigate("/");
    } catch (err: any) {
      onError?.(err.message || "Failed to sign in with Google");
    } finally {
      setLoading?.(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-4 px-4 py-3 border border-white/10 rounded-2xl shadow-lg bg-black/20 text-[15px] font-black text-slate-200 hover:bg-black/40 focus:outline-none transition-all duration-300 disabled:opacity-50 active:scale-[0.98] group"
    >
      <div className="bg-white p-1 rounded-lg shadow-sm">
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
      </div>
      <span className="group-hover:translate-x-0.5 transition-transform">
        {label}
      </span>
    </button>
  );
}
