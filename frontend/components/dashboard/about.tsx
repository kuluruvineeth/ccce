"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

export default function AboutModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>About this project</DialogTitle>
        </DialogHeader>
        <div className="text-sm text-muted-foreground">
          Collaborative Cloud Code Editor is virtual box code editing
          environment with custom AI code autocompletion and real-time
          collaboration. The infrastructire runs on Docker containers and
          Kubernetes to scale automatically based on resource consumption.
        </div>
      </DialogContent>
    </Dialog>
  );
}
