import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="premium-glass rounded-2xl p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-slate-300 mb-6">
          That page doesn't exist or has moved.
        </p>
        <Link
          to="/"
          className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
