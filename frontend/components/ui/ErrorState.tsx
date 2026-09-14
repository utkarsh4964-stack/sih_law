import { AlertTriangle, WifiOff } from "lucide-react";

export function ErrorState({ message }: { message: string }) {
  const isNetwork = message.toLowerCase().includes("unable to connect");
  const Icon = isNetwork ? WifiOff : AlertTriangle;
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-critical/30 bg-critical/5 px-6 py-10 text-center">
      <Icon size={22} className="text-critical" />
      <p className="text-sm text-text">{message}</p>
    </div>
  );
}
