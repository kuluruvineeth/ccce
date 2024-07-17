"use client";

import {
  FileJson,
  Loader,
  Loader2,
  Plus,
  SquareTerminal,
  TerminalSquare,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../ui/resizable";
import { BeforeMount, Editor, OnMount } from "@monaco-editor/react";
import { useEffect, useRef, useState } from "react";
import monaco from "monaco-editor";
import Sidebar from "./sidebar";
import { useClerk } from "@clerk/nextjs";
import Tab from "../ui/tab";
import { TFile, TFolder, TTab } from "./sidebar/types";
import { io } from "socket.io-client";
import { processFileType } from "@/lib/utils";
import { toast } from "sonner";
import EditorTerminal from "./terminal";
import GenerateInput from "./generate";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import LiveblocksProvider from "@liveblocks/yjs";
import { Awareness } from "y-protocols/awareness.js";
import { TypedLiveblocksProvider, useRoom } from "@/liveblocks.config";
import { Avatars } from "./live/avatars";
import { Cursors } from "./live/cursors";
import { User, Virtualbox } from "@/lib/types";
import { Terminal } from "@xterm/xterm";
import { createId } from "@paralleldrive/cuid2";
import DisableAccessModal from "./live/disableModel";
import PreviewWindow from "./preview";
import { ImperativePanelHandle } from "react-resizable-panels";

export default function CodeEditor({
  isSharedUser,
  userData,
  virtualboxData,
}: {
  isSharedUser: boolean;
  userData: User;
  virtualboxData: Virtualbox;
}) {
  //const editorRef = useRef<null | monaco.editor.IStandaloneCodeEditor>(null);
  const [editorRef, setEditorRef] =
    useState<monaco.editor.IStandaloneCodeEditor>();
  const [tabs, setTabs] = useState<TTab[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [ai, setAi] = useState(false);
  const [files, setFiles] = useState<(TFile | TFolder)[]>([]);
  const [editorLanguage, setEditorLanguage] = useState<string | undefined>(
    undefined
  );
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [terminals, setTerminals] = useState<
    {
      id: string;
      terminal: Terminal | null;
    }[]
  >([]);
  const [closingTerminal, setClosingTerminal] = useState("");
  const [provider, setProvider] = useState<TypedLiveblocksProvider>();
  const monacoRef = useRef<typeof monaco | null>(null);
  const [cursorLine, setCursorLine] = useState(0);
  const [activeTerminalId, setActiveTerminalId] = useState("");
  const [creatingTerminal, setCreatingTerminal] = useState(false);

  const generateRef = useRef<HTMLDivElement>(null);
  const [generate, setGenerate] = useState<{
    show: boolean;
    id: string;
    width: number;
    line: number;
    widget: monaco.editor.IContentWidget | undefined;
    pref: monaco.editor.ContentWidgetPositionPreference[];
  }>({ show: false, id: "", width: 0, widget: undefined, line: 0, pref: [] });
  const [decorations, setDecorations] = useState<{
    options: monaco.editor.IModelDecoration[];
    instance: monaco.editor.IEditorDecorationsCollection | undefined;
  }>({ options: [], instance: undefined });
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const generateWidgetRef = useRef<HTMLDivElement>(null);
  const [disableAccess, setDisableAccess] = useState({
    isDisabled: false,
    message: "",
  });
  const [deletingFolderId, setDeletingFolderId] = useState("");
  const [isPreviewCollapsed, setIsPreviewCollapsed] = useState(
    virtualboxData.type !== "react"
  );
  const previewPanelRef = useRef<ImperativePanelHandle>(null);

  const socket = io(
    `http://localhost:4000?userId=${userData.id}&virtualboxId=${virtualboxData.id}`
  );

  const activeTerminal = terminals.find((t) => t.id === activeTerminalId);

  const resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width } = entry.contentRect;
      setGenerate((prev) => {
        return { ...prev, width };
      });
    }
  });
  useEffect(() => {
    console.log("connecting");
    socket.connect();
    console.log("connected");

    if (editorContainerRef.current) {
      resizeObserver.observe(editorContainerRef.current);
    }
    return () => {
      socket.disconnect();

      resizeObserver.disconnect();

      // terminals.forEach((term) => {
      //   if (term.terminal) {
      //     term.terminal.dispose();
      //   }
      // });
    };
  }, []);

  useEffect(() => {
    function onLoadedEvent(files: (TFolder | TFile)[]) {
      console.log("files");
      console.log(files);
      setFiles(files);
    }

    const onRateLimit = (message: string) => {
      toast.error(message);
    };

    const onTerminalResponse = (response: { id: string; data: string }) => {
      // const res = response.data;
      // console.log("terminal response", res);
      const term = terminals.find((t) => t.id === response.id);
      if (term && term.terminal) term.terminal.write(response.data);
    };

    const onConnect = () => {};

    const onDisconnect = () => {
      setTerminals([]);
    };

    const onDisableAccess = (message: string) => {
      setDisableAccess({
        isDisabled: true,
        message: message,
      });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("loaded", onLoadedEvent);
    socket.on("rateLimit", onRateLimit);
    socket.on("terminalResponse", onTerminalResponse);
    socket.on("disableAccess", onDisableAccess);
    return () => {
      socket.off("loaded", onLoadedEvent);
      socket.off("disconnect", onDisconnect);
      socket.off("connect", onConnect);
      socket.off("rateLimit", onRateLimit);
      socket.off("terminalResponse", onTerminalResponse);
      socket.off("disableAccess", onDisableAccess);
    };
  }, [terminals]);

  const closeAllTerminals = () => {
    terminals.forEach((term) => {
      socket.emit("closeTerminal", term.id, () => {});
      setTerminals((prev) => prev.filter((t) => t.id === term.id));
    });
  };

  const selectFile = (tab: TTab) => {
    if (tab.id === activeId) return;
    const exists = tabs.find((t) => t.id === tab.id);
    setTabs((prev) => {
      if (exists) {
        setActiveId(exists.id);
        return prev;
      }
      return [...prev, tab];
    });

    socket.emit("getFile", tab.id, (response: string) => {
      setActiveFile(response);
    });
    setEditorLanguage(processFileType(tab.name));
    setActiveId(tab.id);
  };

  const closeTab = (id: string) => {
    const numTabs = tabs.length;
    const index = tabs.findIndex((t) => t.id === id);

    if (index === -1) return;

    const nextId =
      activeId === id
        ? numTabs === 1
          ? null
          : index < numTabs - 1
          ? tabs[index + 1].id
          : tabs[index - 1].id
        : activeId;

    setTabs((prev) => prev.filter((t) => t.id !== id));

    if (!nextId) {
      setActiveId("");
    } else {
      const nextTab = tabs.find((t) => t.id === nextId);

      if (nextTab) selectFile(nextTab);
    }
  };

  const clerk = useClerk();

  const handleEditorMount: OnMount = (editor, monaco) => {
    setEditorRef(editor);
    monacoRef.current = monaco;

    editor.onDidChangeCursorPosition((e) => {
      const { column, lineNumber } = e.position;
      if (lineNumber === cursorLine) return;
      setCursorLine(lineNumber);

      const model = editor.getModel();
      const endColumn = model?.getLineContent(lineNumber).length || 0;

      //@ts-ignore
      setDecorations((prev) => {
        return {
          ...prev,
          options: [
            {
              range: new monaco.Range(
                lineNumber,
                column,
                lineNumber,
                endColumn
              ),
              options: {
                afterContentClassName: "inline-decoration",
              },
            },
          ],
        };
      });
    });

    editor.onDidBlurEditorText((e) => {
      setDecorations((prev) => {
        return {
          ...prev,
          options: [],
        };
      });
    });

    editor.addAction({
      id: "generate",
      label: "Generate",
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG],
      precondition:
        "editorTextFocus && !suggestWidgetVisible && !renameInputVisible && !inSnippetMode && !quickFixWidgetVisible",
      run: () => {
        setGenerate((prev) => {
          return {
            ...prev,
            show: !prev.show,
            pref: [monaco.editor.ContentWidgetPositionPreference.BELOW],
          };
        });
      },
    });
  };

  const createTerminal = () => {
    setCreatingTerminal(true);
    const id = createId();
    console.log(id);

    setTerminals((prev) => [...prev, { id, terminal: null }]);
    setActiveTerminalId(id);

    setTimeout(() => {
      socket.emit("createTerminal", id, () => {
        setCreatingTerminal(false);
      });
    }, 1000);
  };

  const closeTerminal = (term: { id: string; terminal: Terminal | null }) => {
    const numTerminals = terminals.length;
    const index = terminals.findIndex((t) => t.id === term.id);

    if (index === -1) return;

    setClosingTerminal(term.id);

    socket.emit("closeTerminal", term.id, () => {
      setClosingTerminal("");
      const nextId =
        activeTerminalId === term.id
          ? numTerminals === 1
            ? null
            : index < numTerminals - 1
            ? terminals[index + 1].id
            : terminals[index - 1].id
          : activeTerminalId;

      // if (activeTerminal && activeTerminal.terminal) {
      //   activeTerminal.terminal.dispose();
      // }

      setTerminals((prev) => prev.filter((t) => t.id !== term.id));

      if (!nextId) {
        setActiveTerminalId("");
      } else {
        const nextTerminal = terminals.find((t) => t.id === nextId);
        if (nextTerminal) {
          setActiveTerminalId(nextTerminal.id);
        }
      }
    });
  };

  useEffect(() => {
    console.log("activedId changed:", activeId);
  }, [activeId]);

  const room = useRoom();

  useEffect(() => {
    const tab = tabs.find((t) => t.id === activeId);
    const model = editorRef?.getModel();

    if (!editorRef || !tab || !model) return;

    const yDoc = new Y.Doc();
    const yText = yDoc.getText(tab.id);
    const yProvider: any = new LiveblocksProvider(room, yDoc);

    const onSync = (isSynced: boolean) => {
      if (isSynced) {
        const text = yText.toString();
        if (text === "") {
          if (activeFile) {
            yText.insert(0, activeFile);
          } else {
            setTimeout(() => {
              yText.insert(0, editorRef.getValue());
            }, 0);
          }
        }
      } else {
      }
    };

    yProvider.on("sync", onSync);

    setProvider(yProvider);

    const binding = new MonacoBinding(
      yText,
      model,
      new Set([editorRef]),
      yProvider.awareness as Awareness
    );

    return () => {
      yDoc?.destroy();
      yProvider?.destroy();
      binding?.destroy();
      yProvider.off("sync", onSync);
    };
  }, [editorRef, room, activeFile]);

  useEffect(() => {
    if (!ai) {
      setGenerate((prev) => {
        return {
          ...prev,
          show: false,
        };
      });
      return;
    }
    if (generate.show) {
      editorRef?.changeViewZones(function (changeAccessor) {
        if (!generateRef.current) return;
        const id = changeAccessor.addZone({
          afterLineNumber: cursorLine,
          heightInLines: 3,
          domNode: generateRef.current,
        });

        setGenerate((prev) => {
          return { ...prev, id, line: cursorLine };
        });
      });

      if (!generateWidgetRef.current) return;

      const widgetElement = generateWidgetRef.current;

      const contentWidget = {
        getDomNode: () => {
          return widgetElement;
        },
        getId: () => {
          return "generate.widget";
        },
        getPosition: () => {
          return {
            position: {
              lineNumber: cursorLine,
              column: 1,
            },
            preference: generate.pref,
          };
        },
      };

      setGenerate((prev) => {
        return { ...prev, widget: contentWidget };
      });

      editorRef?.addContentWidget(contentWidget);

      if (generateRef.current && generateWidgetRef.current) {
        editorRef?.applyFontInfo(generateRef.current);
        editorRef?.applyFontInfo(generateWidgetRef.current);
      }
    } else {
      editorRef?.changeViewZones(function (changeAccessor) {
        changeAccessor.removeZone(generate.id);
        setGenerate((prev) => {
          return { ...prev, id: "" };
        });
      });

      if (!generate.widget) return;
      editorRef?.removeContentWidget(generate.widget);
      setGenerate((prev) => {
        return {
          ...prev,
          widget: undefined,
        };
      });
    }
  }, [generate.show]);

  useEffect(() => {
    if (decorations.options.length === 0) {
      decorations.instance?.clear();
    }

    if (!ai) return;

    if (decorations.instance) {
      decorations.instance.set(decorations.options);
    } else {
      const instance = editorRef?.createDecorationsCollection();
      instance?.set(decorations.options);

      setDecorations((prev) => {
        return {
          ...prev,
          instance,
        };
      });
    }
  }, [decorations.options]);

  const handleRename = (
    id: string,
    newName: string,
    oldName: string,
    type: "file" | "folder"
  ) => {
    if (newName === oldName) {
      return false;
    }
    if (
      newName.includes("/") ||
      newName.includes("\\") ||
      newName.includes(" ") ||
      (type === "file" && !newName.includes(".")) ||
      (type === "folder" && newName.includes("."))
    ) {
      toast.error("Invalid file name");
      return false;
    }

    socket.emit("renameFile", id, newName);

    setTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, name: newName } : tab))
    );

    return true;
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        const activeTab = tabs.find((t) => t.id === activeId);

        setTabs((prev) =>
          prev.map((tab) =>
            tab.id === activeId ? { ...tab, saved: true } : tab
          )
        );

        socket.emit("saveFile", activeId, editorRef?.getValue());
      }
    };

    document.addEventListener("keydown", down);

    return () => {
      document.removeEventListener("keydown", down);
    };
  }, [tabs, activeId]);

  const handleDeleteFile = (file: TFile) => {
    socket.emit("deleteFile", file.id, (response: (TFolder | TFile)[]) => {
      setFiles(response);
    });
    closeTab(file.id);
  };

  const closeTabs = (ids: string[]) => {
    const numTabs = tabs.length;

    if (numTabs === 0) return;

    const allIndexes = ids.map((id) => tabs.findIndex((t) => t.id === id));

    const indexes = allIndexes.filter((index) => index !== -1);
    if (indexes.length === 0) return;

    const activeIndex = tabs.findIndex((t) => t.id === activeId);

    const newTabs = tabs.filter((t) => !ids.includes(t.id));
    setTabs(newTabs);

    if (indexes.length === numTabs) {
      setActiveId("");
    } else {
      const nextTab =
        newTabs.length > activeIndex
          ? newTabs[activeIndex]
          : newTabs[newTabs.length - 1];
      if (nextTab) {
        selectFile(nextTab);
      }
    }
  };

  const handleDeleteFolder = (folder: TFolder) => {
    setDeletingFolderId(folder.id);

    socket.emit("getFolder", folder.id, (response: string[]) =>
      closeTabs(response)
    );

    socket.emit("deleteFolder", folder.id, (response: (TFolder | TFile)[]) => {
      setFiles(response);
      setDeletingFolderId("");
    });

    setTimeout(() => {
      setDeletingFolderId("");
    }, 3000);
  };

  const handleEditorWillMount: BeforeMount = (monaco) => {
    monaco.editor.addKeybindingRules([
      {
        keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyG,
        command: "null",
      },
    ]);
  };

  if (disableAccess.isDisabled) {
    return (
      <>
        <DisableAccessModal
          message={disableAccess.message}
          open={disableAccess.isDisabled}
          setOpen={() => {}}
        />
      </>
    );
  }

  return (
    <>
      <div ref={generateRef} />
      <div className="z-50 p-1" ref={generateWidgetRef}>
        {generate.show && ai ? (
          <GenerateInput
            user={userData}
            socket={socket}
            data={{
              fileName: tabs.find((t) => t.id === activeId)?.name ?? "",
              code: editorRef?.getValue() ?? "",
              line: generate.line,
            }}
            editor={{
              language: editorLanguage!,
            }}
            cancel={() => {}}
            submit={(str: string) => {}}
            width={generate.width - 90}
            onExpand={() => {
              editorRef?.changeViewZones(function (changeAccessor) {
                changeAccessor.removeZone(generate.id);

                if (!generateRef.current) return;

                const id = changeAccessor.addZone({
                  afterLineNumber: cursorLine,
                  heightInLines: 12,
                  domNode: generateRef.current,
                });

                setGenerate((prev) => {
                  return { ...prev, id };
                });
              });
            }}
            onAccept={(code: string) => {
              const line = generate.line;
              setGenerate((prev) => {
                return {
                  ...prev,
                  show: !prev.show,
                };
              });
              console.log("accepted:", code);
              const file = editorRef?.getValue();

              const lines = file?.split("\n") || [];
              lines.splice(line - 1, 0, code);
              const updatedFile = lines.join("\n");
              editorRef?.setValue(updatedFile);
            }}
          />
        ) : null}
      </div>
      <Sidebar
        virtualboxData={virtualboxData}
        setFiles={setFiles}
        files={files}
        selectFile={selectFile}
        handleRename={handleRename}
        handleDeleteFile={handleDeleteFile}
        handleDeleteFolder={handleDeleteFolder}
        socket={socket}
        addNew={(name, type) => {
          if (type === "file") {
            setFiles((prev) => [
              ...prev,
              {
                id: `projects/${virtualboxData.id}/${name}`,
                name,
                type: "file",
              },
            ]);
          } else {
            setFiles((prev) => [
              ...prev,
              {
                id: `projects/${virtualboxData.id}/${name}`,
                name,
                type: "folder",
                children: [],
              },
            ]);
          }
        }}
        ai={ai}
        setAi={setAi}
        deletingFolderId={deletingFolderId}
      />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel
          maxSize={80}
          minSize={30}
          defaultSize={60}
          className="flex flex-col p-2"
        >
          <div className="h-10 w-full flex gap-2">
            {tabs.map((tab) => (
              <Tab
                key={tab.id}
                saved={tab.saved}
                selected={activeId === tab.id}
                onClick={() => selectFile(tab)}
                onClose={() => closeTab(tab.id)}
              >
                {tab.name}
              </Tab>
            ))}
          </div>
          <div
            ref={editorContainerRef}
            className="grow w-full overflow-hidden rounded-lg relative"
          >
            {!activeId ? (
              <>
                <div className="flex items-center w-full h-full justify-center text-xl font-medium text-secondary select-none">
                  <FileJson className="w-6 h-6 mr-3" />
                  No File selected
                </div>
              </>
            ) : clerk.loaded ? (
              <>
                {provider ? <Cursors yProvider={provider} /> : null}
                <Editor
                  height={"100%"}
                  defaultLanguage="typescript"
                  theme="vs-dark"
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorMount}
                  onChange={(value) => {
                    if (value === activeFile) {
                      setTabs((prev) =>
                        prev.map((tab) =>
                          tab.id === activeId ? { ...tab, saved: true } : tab
                        )
                      );
                    } else {
                      setTabs((prev) =>
                        prev.map((tab) =>
                          tab.id === activeId ? { ...tab, saved: false } : tab
                        )
                      );
                    }
                  }}
                  language={editorLanguage}
                  options={{
                    minimap: {
                      enabled: false,
                    },
                    padding: {
                      bottom: 4,
                      top: 4,
                    },
                    scrollBeyondLastLine: false,
                    fixedOverflowWidgets: true,
                    fontFamily: "var(--font-geist-mono)",
                  }}
                  value={activeFile ?? ""}
                />
              </>
            ) : null}
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={40}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel
              ref={previewPanelRef}
              collapsedSize={4}
              defaultSize={4}
              minSize={25}
              collapsible
              onCollapse={() => setIsPreviewCollapsed(true)}
              onExpand={() => setIsPreviewCollapsed(false)}
              className="p-2 flex flex-col"
            >
              <PreviewWindow
                collapsed={isPreviewCollapsed}
                open={() => {
                  previewPanelRef.current?.expand();
                  setIsPreviewCollapsed(false);
                }}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel
              defaultSize={50}
              minSize={20}
              className="p-2 flex flex-col"
            >
              <div className="h-10 w-full flex gap-2 shrink-0 overflow-auto tab-scroll">
                {terminals.map((term) => (
                  <Tab
                    key={term.id}
                    onClick={() => setActiveTerminalId(term.id)}
                    onClose={() => closeTerminal(term)}
                    selected={activeTerminalId === term.id}
                  >
                    <SquareTerminal className="w-4 h-4 mr-2" />
                    Shell
                  </Tab>
                ))}
                <Button
                  disabled={creatingTerminal}
                  onClick={() => {
                    if (terminals.length >= 4) {
                      toast.error("You reached the maximum # of terminals.");
                      return;
                    }
                    createTerminal();
                  }}
                  size={"smIcon"}
                  variant={"secondary"}
                  className="font-normal shrink-0 select-none text-muted-foreground"
                >
                  {creatingTerminal ? (
                    <Loader2 className="animate-spin w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {socket && activeTerminal ? (
                <div className="w-full relative grow h-full overflow-hidden rounded-lg bg-secondary">
                  {terminals.map((term) => (
                    <EditorTerminal
                      key={term.id}
                      socket={socket}
                      id={activeTerminal.id}
                      term={activeTerminal.terminal}
                      setTerm={(t: Terminal) => {
                        setTerminals((prev) =>
                          prev.map((term) =>
                            term.id === activeTerminalId
                              ? { ...term, terminal: t }
                              : term
                          )
                        );
                      }}
                      visible={activeTerminalId === term.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-medium text-muted-foreground/50 select-none">
                  <TerminalSquare className="w-4 h-4 mr-2" />
                  No Terminals Open
                </div>
              )}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  );
}
