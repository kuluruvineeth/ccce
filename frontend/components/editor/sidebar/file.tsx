"use client";

import { getIconForFile } from "vscode-icons-js";
import { TFile, TTab } from "./types";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

export default function SidebarFile({
  data,
  selectFile,
  handleRename,
  handleDeleteFile,
  movingId,
  deletingFolderId,
}: {
  data: TFile;
  selectFile: (file: TTab) => void;
  handleRename: (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => boolean;
  handleDeleteFile: (file: TFile) => void;
  movingId: string;
  deletingFolderId: string;
}) {
  const [imgSrc, setImgSrc] = useState(`/icons/${getIconForFile(data.name)}`);
  const isDeleting =
    deletingFolderId.length > 0 && data.id.startsWith(deletingFolderId);

  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState(isDeleting);

  const isMoving = movingId === data.id;

  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setPendingDelete(isDeleting);
  }, [isDeleting]);

  useEffect(() => {
    if (editing) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!inputRef.current) {
      console.log("no input ref");
    }
  }, [editing, inputRef.current]);

  const renameFile = () => {
    const renamed = handleRename(
      data.id,
      inputRef.current?.value ?? data.name,
      data.name,
      "file"
    );

    if (!renamed && inputRef.current) {
      inputRef.current.name = data.name;
    }

    setEditing(false);
  };

  useEffect(() => {
    const el = ref.current;

    if (el) {
      return draggable({
        element: el,
        onDragStart: () => setDragging(true),
        onDrop: () => setDragging(false),
        getInitialData: () => ({ id: data.id }),
      });
    }
  }, []);

  return (
    <ContextMenu>
      <ContextMenuTrigger
        ref={ref}
        disabled={pendingDelete || dragging || isMoving}
        onClick={() => {
          if (!editing && !pendingDelete && !isMoving)
            selectFile({ ...data, saved: true });
        }}
        className={`${
          dragging ? "opacity-50 hover:!bg-background" : ""
        } data-[state=open]:bg-secondary/50
        w-full flex items-center h-7 px-1 hover:bg-secondary rounded-sm cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring`}
      >
        <Image
          src={imgSrc}
          alt="File Icon"
          width={18}
          height={18}
          className="mr-2"
          onError={() => setImgSrc("/icons/default_file.svg")}
        />
        {isMoving ? (
          <>
            <Loader2 className="text-muted-foreground w-4 h-4 animate-spin mr-2" />
            <div className="text-muted-foreground">{data.name}</div>
          </>
        ) : pendingDelete ? (
          <>
            <Loader2 className="text-muted-foreground w-4 h-4 animate-spin mr-2" />
            <div className="text-muted-foreground">Deleting....</div>
          </>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              renameFile();
            }}
          >
            <input
              className={`bg-transparent w-full outline-foreground ${
                editing ? "" : "pointer-events-none"
              }`}
              ref={inputRef}
              disabled={!editing}
              defaultValue={data.name}
              onBlur={() => renameFile()}
            />
          </form>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            setEditing(true);
          }}
        >
          <Pencil className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          disabled={pendingDelete}
          onClick={() => {
            setPendingDelete(true);
            handleDeleteFile(data);
          }}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
