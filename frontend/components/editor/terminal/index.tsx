"use client";

import { useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "./xterm.css";
import { Loader2 } from "lucide-react";

export default function EditorTerminal({
  visible,
  id,
  socket,
  term,
  setTerm,
}: {
  visible: boolean;
  id: string;
  socket: Socket;
  term: Terminal | null;
  setTerm: (term: Terminal) => void;
}) {
  const terminalRef = useRef(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    if (term) return;

    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#262626",
      },
      fontSize: 14,
      fontFamily: "var(--font-geist-mono)",
      lineHeight: 1.5,
      letterSpacing: 0,
    });

    setTerm(terminal);

    return () => {
      if (terminal) terminal.dispose();
    };
  }, []);

  useEffect(() => {
    if (!term) return;

    if (!terminalRef.current) return;

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    const disposableOnData = term.onData((data) => {
      socket.emit("terminalData", id, data);
    });

    const disposableOnResize = term.onResize((dimensions) => {
      fitAddon.fit();
      socket.emit("terminalResize", dimensions);
    });

    // socket.emit("terminalData", "\n");

    return () => {
      disposableOnData.dispose();
      disposableOnResize.dispose();
    };
  }, [term, terminalRef.current]);

  return (
    <div>
      <div
        ref={terminalRef}
        style={{ display: visible ? "block" : "none" }}
        className="w-full h-full text-left"
      >
        {term === null ? (
          <div className="flex items-center text-muted-foreground p-2">
            <Loader2 className="animate-spin mr-2 w-4 h-4" />
            <span>Connecting to terminal....</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
