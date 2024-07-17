import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ProjectCard({
  children,
  id,
  className,
}: {
  children: React.ReactNode;
  id: string;
  className?: string;
}) {
  return (
    <Link
      href={`/code/${id}`}
      tabIndex={0}
      className={cn(
        className,
        "rounded-lg border bg-card text-card-foreground shadow h-48 p-[1px] gradient-project-card-bg cursor-pointer transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      )}
    >
      <div className="rounded-[7px] p-4 h-full flex flex-col justify-between gradient-project-card">
        {children}
      </div>
    </Link>
  );
}
