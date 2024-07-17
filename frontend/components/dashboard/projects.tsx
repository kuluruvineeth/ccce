import { Virtualbox } from "@/lib/types";
import ProjectCard from "./projectCard";
import ProjectCardDropdown from "./projectCard/dropdown";
import { Clock, Globe, Lock } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { deleteVirtualbox, updateVirtualbox } from "@/lib/actions";

export default function DashboardProjects({
  virtualboxes,
  q,
}: {
  virtualboxes: Virtualbox[];
  q: string | null;
}) {
  const onDelete = async (virtualbox: Virtualbox) => {
    toast(`Project ${virtualbox.name} deleted.`);
    await deleteVirtualbox(virtualbox.id);
  };

  const onVisibilityChange = async (virtualbox: Virtualbox) => {
    const newVisibility =
      virtualbox.visibility === "public" ? "private" : "public";

    toast(`Project ${virtualbox.name} is now ${newVisibility}`);
    await updateVirtualbox({
      id: virtualbox.id,
      visibility: newVisibility,
    });
  };

  return (
    <div className="grow p-4 flex flex-col">
      <div className="text-xl font-medium mb-8">
        {q && q.length > 0 ? `Showing search results for: ${q}` : "My Projects"}
      </div>
      <div className="grow w-full grid lg:grid-cols-3 2xl:grid-cols-4 md:grid-cols-2 gap-4">
        {virtualboxes.map((virtualbox) => {
          if (q && q.length > 0) {
            if (!virtualbox.name.toLowerCase().includes(q.toLowerCase())) {
              return null;
            }
          }
          return (
            <ProjectCard key={virtualbox.id} id={virtualbox.id}>
              <div className="flex space-x-2 items-center justify-start w-full">
                <Image
                  alt=""
                  src={
                    virtualbox.type === "react"
                      ? "/project-icons/react.svg"
                      : "/project-icons/node.svg"
                  }
                  width={20}
                  height={20}
                />
                <div className="font-medium flex items-center whitespace-nowrap w-full text-ellipsis overflow-hidden">
                  {virtualbox.name}
                </div>
                <ProjectCardDropdown
                  virtualbox={virtualbox}
                  onVisibilityChange={onVisibilityChange}
                  onDelete={onDelete}
                />
              </div>

              <div className="flex flex-col text-muted-foreground space-y-0.5 text-sm">
                <div className="flex items-center">
                  {virtualbox.visibility === "public" ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      <span>Make Private</span>
                    </>
                  ) : (
                    <>
                      <Globe className="mr-2 h-4 w-4" />
                      <span>Make Public</span>
                    </>
                  )}
                </div>
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-2" /> 3d ago
                </div>
              </div>
            </ProjectCard>
          );
        })}
      </div>
    </div>
  );
}
