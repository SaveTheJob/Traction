import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>
      <iframe
        src="/privacy-policy/index.html"
        className="w-full flex-1 border-none"
        title="Privacy Policy"
      />
    </div>
  );
}
