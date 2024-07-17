"use client";
import Image from "next/image";
import Logo from "@/assets/logo.svg";
import { Pencil, Users } from "lucide-react";
import Link from "next/link";
import { User, Virtualbox } from "@/lib/types";
import UserButton from "@/components/ui/userButton";
import { useState } from "react";
import EditVirtualboxModal from "./edit";
import { Button } from "@/components/ui/button";
import ShareVirtualboxModal from "./share";
import { Avatars } from "../live/avatars";

export default function Navbar({
  userData,
  virtualboxData,
  shared,
}: {
  userData: User;
  virtualboxData: Virtualbox;
  shared: {
    id: string;
    name: string;
  }[];
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const isOwner = virtualboxData.userId === userData.id;
  return (
    <>
      <EditVirtualboxModal
        open={isEditOpen}
        setOpen={setIsEditOpen}
        data={virtualboxData}
      />
      <ShareVirtualboxModal
        open={isShareOpen}
        setOpen={setIsShareOpen}
        data={virtualboxData}
        shared={shared}
      />
      <div className="h-14 px-2 w-full flex items-center justify-between border-b border-border">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="ring-offset-2 ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none rounded-sm"
          >
            <Image src={Logo} alt="Logo" width={36} height={36} />
          </Link>
          <div className="text-sm font-medium flex items-center">
            {virtualboxData.name}
            {isOwner ? (
              <button
                onClick={() => setIsEditOpen(true)}
                className="h-7 w-7 ml-2 flex items-center justify-center transition-colors bg-transparent hover:bg-muted-foreground/25 cursor-pointer rounded-md"
              >
                <Pencil className="w-4 h-4" />
              </button>
            ) : null}
          </div>
          <div className="flex items-center space-x-4">
            <Avatars />
            {isOwner ? (
              <Button variant={"outline"} onClick={() => setIsShareOpen(true)}>
                <Users className="w-4 h-4 mr-2" />
                Share
              </Button>
            ) : null}

            <UserButton userData={userData} />
          </div>
        </div>
      </div>
    </>
  );
}
