"use client";

import { X } from "lucide-react";
import { Button } from "./button";
import { MouseEventHandler } from "react";

export default function Tab({
  children,
  saved,
  selected,
  onClick,
  onClose,
}: {
  children: React.ReactNode;
  saved?: boolean;
  selected?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onClose?: () => void;
}) {
  return (
    <Button
      onClick={onClick ?? undefined}
      size={"sm"}
      variant={"secondary"}
      className={`font-normal select-none ${
        selected
          ? "bg-neutral-700 hover:bg-neutral-600 text-foreground"
          : "text-muted-foreground"
      }`}
    >
      {children}
      <div
        onClick={
          onClose
            ? (e) => {
                e.stopPropagation();
                e.preventDefault();
                onClose();
              }
            : undefined
        }
        className="h-5 w-5 ml-0.5 group flex items-center justify-center translate-x-1 transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-sm"
      >
        {saved ? (
          <X className="w-3 h-3" />
        ) : (
          <>
            <X className="w-3 h-3 group-hover:block hidden" />
            <div className="w-2 h-2 rounded-full bg-foreground group-hover:hidden" />
          </>
        )}
      </div>
    </Button>
  );
}
