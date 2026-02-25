interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case "Interviewing":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Interviewing
        </span>
      );
    case "Applied":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Applied
        </span>
      );
    case "Offer":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Offer
        </span>
      );
    case "Rejected":
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Rejected
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>
      );
  }
}
