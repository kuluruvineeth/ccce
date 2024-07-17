import express, { Express } from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import getVirtualboxFiles from "./getVirtualboxFiles";
import { z } from "zod";
import {
  createFile,
  deleteFile,
  generateCode,
  getFolder,
  getProjectSize,
  renameFile,
  saveFile,
  testDescribe,
} from "./utils";
import path from "path";
import fs from "fs";
import { IDisposable, IPty, spawn } from "node-pty";
import os from "os";
import {
  MAX_BODY_SIZE,
  createFileRL,
  createFolderRL,
  deleteFileRL,
  renameFileRL,
  saveFileRL,
} from "./ratelimit";

const app: Express = express();

const port = process.env.PORT || 4000;

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

let inactivityTimeout: NodeJS.Timeout | null = null;
let isOwnerConnected = false;

const terminals: {
  [id: string]: {
    terminal: IPty;
    onData: IDisposable;
    onExit: IDisposable;
  };
} = {};

const dirName = path.join(__dirname, "..");

const handshakeSchema = z.object({
  userId: z.string(),
  virtualboxId: z.string(),
  EIO: z.string(),
  transport: z.string(),
  t: z.string(),
});

io.use(async (socket, next) => {
  const q = socket.handshake.query;

  console.log("middleware");
  console.log(q);

  const parseQuery = handshakeSchema.safeParse(q);

  if (!parseQuery.success) {
    console.log("issue here");
    next(new Error("Invalid request"));
    return;
  }

  const { virtualboxId, userId } = parseQuery.data;
  console.log("virtualboxId: ", virtualboxId);
  const dbUser = await fetch(
    `https://database.cestorage.workers.dev/api/user?id=${userId}`
  );
  const dbUserJSON = await dbUser.json();
  console.log(dbUserJSON);

  if (!dbUserJSON) {
    next(new Error("DB error"));
    return;
  }

  const virtualbox = dbUserJSON.virtualbox.find(
    (v: any) => v.id === virtualboxId
  );

  const sharedVirtualboxes = dbUserJSON.usersToVirtualboxes.find(
    (utv: any) => utv.virtualboxId === virtualboxId
  );
  console.log(virtualbox);
  if (!virtualbox && !sharedVirtualboxes) {
    next(new Error("Invalid credentials"));
    return;
  }

  socket.data = {
    id: virtualboxId,
    userId,
    isOwner: virtualbox !== undefined,
  };

  next();
});

io.on("connection", async (socket) => {
  console.log("connected");

  if (inactivityTimeout) clearTimeout(inactivityTimeout);
  const data = socket.data as {
    userId: string;
    id: string;
    isOwner: boolean;
  };

  if (data.isOwner) {
    isOwnerConnected = true;
  } else if (!isOwnerConnected) {
    console.log("the virtual box owner not connected");
    socket.emit("disableAccess", "The virtualbox owner is not connected.");
    return;
  }

  console.log("describing services");
  const describeService = await testDescribe();
  console.log(describeService);
  console.log(data);
  const virtualboxFiles = await getVirtualboxFiles(data.id);
  virtualboxFiles.fileData.forEach((file) => {
    const filePath = path.join(dirName, file.id);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFile(filePath, file.data, function (err) {
      if (err) throw err;
    });
  });

  socket.emit("loaded", virtualboxFiles.files);

  socket.on("getFile", (fileId: string, callback) => {
    const file = virtualboxFiles.fileData.find((f) => f.id === fileId);
    if (!file) return;

    callback(file.data);
  });

  socket.on("saveFile", async (fileId: string, body: string) => {
    try {
      await saveFileRL.consume(data.userId, 1);

      if (Buffer.byteLength(body, "utf-8") > MAX_BODY_SIZE) {
        socket.emit(
          "rateLimit",
          "Rate limited: file size too large. Please reduce the file size."
        );
        return;
      }

      const file = virtualboxFiles.fileData.find((f) => f.id === fileId);
      if (!file) return;

      file.data = body;

      fs.writeFile(path.join(dirName, file.id), body, function (err) {
        if (err) throw err;
      });

      await saveFile(fileId, body);
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file saving. Please slow down.");
    }
  });

  socket.on("createFile", async (name: string, callback) => {
    try {
      const size: number = await getProjectSize(data.id);
      if (size > 200 * 1024 * 1024) {
        io.emit(
          "rateLimit",
          "Rate Limited: project size exceeded. Please delete some files."
        );
        callback({ success: false });
      }
      await createFileRL.consume(data.userId, 1);
      const id = `projects/${data.id}/${name}`;

      fs.writeFile(path.join(dirName, id), "", function (err) {
        if (err) throw err;
      });

      virtualboxFiles.files.push({
        id,
        name,
        type: "file",
      });

      virtualboxFiles.fileData.push({
        id,
        data: "",
      });

      await createFile(id);
      callback({ success: true });
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file saving. Please slow down.");
    }
  });

  socket.on("moveFile", async (fileId: string, folderId: string, callback) => {
    const file = virtualboxFiles.fileData.find((f) => f.id === fileId);

    if (!file) return;

    const parts = fileId.split("/");
    const newFileId = folderId + "/" + parts.pop();

    fs.rename(
      path.join(dirName, fileId),
      path.join(dirName, newFileId),
      function (err) {
        if (err) throw err;
      }
    );

    file.id = newFileId;

    await renameFile(fileId, newFileId, file.data);
    const newFiles = await getVirtualboxFiles(data.id);

    callback(newFiles.files);
  });

  socket.on("getFolder", async (folderId: string, callback) => {
    const files = await getFolder(folderId);
    callback(files);
  });

  socket.on("deleteFolder", async (folderId: string, callback) => {
    const files = await getFolder(folderId);

    await Promise.all(
      files.map(async (file) => {
        fs.unlink(path.join(dirName, file), function (err) {
          if (err) throw err;
        });

        virtualboxFiles.fileData = virtualboxFiles.fileData.filter(
          (f) => f.id !== file
        );

        await deleteFile(file);
      })
    );

    const newFiles = await getVirtualboxFiles(data.id);

    callback(newFiles.files);
  });

  socket.on("renameFolder", async (folderId: string, callback) => {});

  socket.on("createFolder", async (name: string, callback) => {
    try {
      await createFolderRL.consume(data.userId, 1);

      const id = `projects/${data.id}/${name}`;

      fs.mkdir(path.join(dirName, id), { recursive: true }, function (err) {
        if (err) throw err;
      });

      callback();
    } catch (e) {
      io.emit("rateLimit", "Rate limited: folder creation. Please slow down");
    }
  });
  socket.on("deleteFile", async (fileId: string, callback) => {
    try {
      await deleteFileRL.consume(data.userId, 1);
      const file = virtualboxFiles.fileData.find((f) => f.id === fileId);
      if (!file) return;

      fs.unlink(path.join(dirName, fileId), function (err) {
        if (err) throw err;
      });

      virtualboxFiles.fileData = virtualboxFiles.fileData.filter(
        (f) => f.id !== fileId
      );

      await deleteFile(fileId);

      const newFiles = await getVirtualboxFiles(data.id);
      callback(newFiles.files);
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file saving. Please slow down.");
    }
  });

  socket.on("resizeTerminal", (dimensions: { cols: number; rows: number }) => {
    Object.values(terminals).forEach((t) => {
      t.terminal.resize(dimensions.cols, dimensions.rows);
    });
  });

  socket.on("renameFile", async (fileId: string, newName: string) => {
    try {
      await renameFileRL.consume(data.userId, 1);
      const file = virtualboxFiles.fileData.find((f) => f.id === fileId);

      if (!file) return;

      file.id = newName;
      const parts = fileId.split("/");
      const newFileId =
        parts.slice(0, parts.length - 1).join("/") + "/" + newName;

      fs.rename(
        path.join(dirName, fileId),
        path.join(dirName, newFileId),
        function (err) {
          if (err) throw err;
        }
      );
      await renameFile(fileId, newFileId, file.data);
    } catch (e) {
      io.emit("rateLimit", "Rate limited: file saving. Please slow down.");
    }
  });

  socket.on("createTerminal", (id: string, callback) => {
    if (terminals[id] || Object.keys(terminals).length >= 4) {
      return;
    }

    console.log("creating terminal (" + id + ")");
    const pty = spawn(os.platform() === "win32" ? "cmd.exe" : "bash", [], {
      name: "xterm",
      cols: 100,
      cwd: path.join(dirName, "projects", data.id),
    });

    const onData = pty.onData((data) => {
      io.emit("terminalResponse", {
        id,
        data,
      });
    });

    const onExit = pty.onExit((code) => console.log("exit:(", code));
    pty.write("clear\r");
    terminals[id] = {
      terminal: pty,
      onData,
      onExit,
    };

    callback();
  });

  socket.on("closeTerminal", (id: string, callback) => {
    if (!terminals[id]) {
      console.log(
        "tried to close, but term does not exists. terminals",
        terminals
      );
      return;
    }

    terminals[id].onData.dispose();
    terminals[id].onExit.dispose();

    delete terminals[id];

    callback();
  });

  socket.on("terminalData", (id: string, data: string) => {
    console.log(`Received data for terminal ${id}: ${data}`);
    if (!terminals[id]) {
      return;
    }

    try {
      terminals[id].terminal.write(data);
    } catch (e) {
      console.log("Error writing to terminal", e);
    }
  });

  socket.on(
    "generateCode",
    async (
      fileName: string,
      code: string,
      line: number,
      instructions: string,
      callback
    ) => {
      const fetchPromise = fetch(
        `https://database.cestorage.workers.dev/api/virtualbox/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: data.userId,
          }),
        }
      );

      const generateCodePromise = generateCode({
        fileName,
        code,
        line,
        instructions,
      });

      const [fetchResponse, generateCodeResponse] = await Promise.all([
        fetchPromise,
        generateCodePromise,
      ]);
      const json = await generateCodeResponse.json();
      callback(json);
    }
  );

  socket.on("disconnect", async () => {
    if (data.isOwner) {
      Object.entries(terminals).forEach((t) => {
        const { terminal, onData, onExit } = t[1];
        if (os.platform() !== "win32") terminal.kill();
        onData.dispose();
        onExit.dispose();
        delete terminals[t[0]];
      });

      console.log("The owner disconnected");
      socket.broadcast.emit("ownerDisconnected");
    } else {
      console.log("A shared user disconnected.");
      socket.broadcast.emit(
        "disableAccess",
        "The virtualbox owner has disconnected."
      );
    }

    const sockets = await io.fetchSockets();
    if (inactivityTimeout) {
      clearTimeout(inactivityTimeout);
    }
    if (sockets.length === 0) {
      inactivityTimeout = setTimeout(() => {
        io.fetchSockets().then((sockets) => {
          if (sockets.length === 0) {
            console.log("No users have been connected for 15 seconds");
          }
        });
      }, 15000);
    }
  });
});

httpServer.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
