interface NetworkStatusBadgeProps {
  status: string;
}

export default function NetworkStatusBadge({
  status,
}: NetworkStatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Hot":
        return "bg-red-100 text-red-700";
      case "Warm":
        return "bg-orange-100 text-orange-700";
      case "Cold":
        return "bg-blue-100 text-blue-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(status)}`}
    >
      {status}
    </span>
  );
}
