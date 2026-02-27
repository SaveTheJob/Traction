interface NetworkStatusBadgeProps {
  status: string;
}

export default function NetworkStatusBadge({
  status,
}: NetworkStatusBadgeProps) {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Hot":
        return "bg-red-900/30 text-red-400";
      case "Warm":
        return "bg-orange-900/30 text-orange-400";
      case "Cold":
        return "bg-blue-900/30 text-blue-400";
      default:
        return "bg-slate-800 text-slate-300";
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
