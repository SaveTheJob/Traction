interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "Interviewing":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-300">
          Interviewing
        </span>
      );
    case "Applied":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
          Applied
        </span>
      );
    case "Offer":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/30 text-green-300">
          Offer
        </span>
      );
    case "Rejected":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-900/30 text-red-300">
          Rejected
        </span>
      );
    case "Wishlist":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-900/30 text-purple-300">
          Saved
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300">
          {status}
        </span>
      );
  }
}
