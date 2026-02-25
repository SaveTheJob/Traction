interface NetworkStatusBadgeProps {
  status: string;
}

export default function NetworkStatusBadge({
  status,
}: NetworkStatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Hot":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "Warm":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
      case "Cold":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
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
