import Link from "next/link";

export default function AppLogo() {
  return (
    <Link
      href="/dashboard"
      className="flex flex-col gap-1 px-4 py-4"
    >
      <span className="text-2xl font-bold text-primary">
        PLMS
      </span>

      <span className="text-xs text-muted-foreground">
        Property Listing Management
      </span>
    </Link>
  );
}