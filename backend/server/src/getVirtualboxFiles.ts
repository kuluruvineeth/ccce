import { R2FileData, R2Files, TFile, TFileData, TFolder } from "./types";

const getVirtualboxFiles = async (id: string) => {
  const virtualboxRes = await fetch(
    `https://storage.cestorage.workers.dev/api?virtualboxId=${id}`
  );
  const virtualboxData: R2Files = await virtualboxRes.json();

  const paths = virtualboxData.objects.map((obj) => obj.key);

  return processFiles(paths, id);
};

const processFiles = async (paths: string[], id: string) => {
  const root: TFolder = { id: "/", type: "folder", name: "/", children: [] };

  const fileData: TFileData[] = [];

  paths.forEach((path) => {
    const allParts = path.split("/");
    if (allParts[1] !== id) {
      return;
    }

    const parts = allParts.slice(2);
    let current: TFolder = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1 && part.includes(".");
      const existing = current.children.find((child) => child.name === part);

      if (existing) {
        if (!isFile) {
          current = existing as TFolder;
        }
      } else {
        if (isFile) {
          const file: TFile = { id: path, type: "file", name: part };
          current.children.push(file);
          fileData.push({ id: path, data: "" });
        } else {
          const folder: TFolder = {
            id: `projects/${id}/${parts.slice(0, i + 1).join("/")}`,
            type: "folder",
            name: part,
            children: [],
          };
          current.children.push(folder);
          current = folder;
        }
      }
    }
  });

  await Promise.all(
    fileData.map(async (file) => {
      const data = await fetchFileContent(file.id);
      file.data = data;
    })
  );

  return { files: root.children, fileData };
};

const fetchFileContent = async (fileId: string): Promise<string> => {
  try {
    const fileRes = await fetch(
      `https://storage.cestorage.workers.dev/api?fileId=${fileId}`
    );
    return await fileRes.text();
  } catch (error) {
    return "";
  }
};

export default getVirtualboxFiles;
