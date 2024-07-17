import {
  DeleteServiceCommand,
  DescribeServicesCommand,
  ECSClient,
  StopTaskCommand,
} from "@aws-sdk/client-ecs";
import { R2Files } from "./types";
import { error } from "console";

const client = new ECSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "",
    secretAccessKey: "",
  },
});

export const testDescribe = async () => {
  const command = new DescribeServicesCommand({
    cluster: "virtualboxccce",
    services: ["virtualboxccce"],
  });

  const response = await client.send(command);
  console.log("describing:", response);
  return response;
};

export const stopServer = async (service: string) => {
  const command = new DeleteServiceCommand({
    cluster: "virtualboxccce",
    service,
    force: true,
  });

  try {
    const response = await client.send(command);
    console.log("Stopped server:", response);
  } catch (error) {
    console.error("Error stopping server: ", error);
  }
};

export const renameFile = async (
  fileId: string,
  newFileId: string,
  data: string
) => {
  const res = await fetch(`https://storage.cestorage.workers.dev/api/rename`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId, newFileId, data }),
  });

  console.log(res);

  return res.ok;
};

export const saveFile = async (fileId: string, data: string) => {
  const res = await fetch(`https://storage.cestorage.workers.dev/api/save`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId, data }),
  });

  return res.ok;
};

export const createFile = async (fileId: string) => {
  const res = await fetch(`https://storage.cestorage.workers.dev/api`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  });

  return res.ok;
};

export const deleteFile = async (fileId: string) => {
  const res = await fetch(`https://storage.cestorage.workers.dev/api`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId }),
  });

  return res.ok;
};

export const generateCode = async ({
  fileName,
  code,
  line,
  instructions,
}: {
  fileName: string;
  code: string;
  line: number;
  instructions: string;
}) => {
  return await fetch(
    "https://api.cloudflare.com/client/v4/accounts/b8a66f8a4ddbd419ef8e4bdfeea7aa60/ai/run/@cf/meta/llama-3-8b-instruct",
    {
      method: "POST",
      headers: {
        Authorization: "Bearer RBd66QH1LW3WFFjoarc1TBGgON0UcekCk3EnU_uC",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content:
              "You are an expert coding assistant who reads from an existing code file, and suggests code to add to the file. You may be given instructions on what to generate, which you should follow. You should generate code that is correct, efficient, and follows best practices. You should also generate code that is clear and easy to read.",
          },
          {
            role: "user",
            content: `The file is called ${fileName}.`,
          },
          {
            role: "user",
            content: `Here are my instructions on what to generate: ${instructions}.`,
          },
          {
            role: "user",
            content: `Suggest me code to insert at line ${line} in my file. Give only the code, and NOTHING else. DO NOT include backticks in your response. My code file content is as follows  
            
            ${code}`,
          },
        ],
      }),
    }
  );
};

export const getProjectSize = async (id: string) => {
  const res = await fetch(
    `https://storage.cestorage.workers.dev/api/size?virtualboxId=${id}`
  );

  return (await res.json()).size;
};

export const getFolder = async (folderId: string) => {
  const res = await fetch(
    `https://storage.cestorage.workers.dev/api?folderId=${folderId}`
  );

  const data: R2Files = await res.json();

  return data.objects.map((obj) => obj.key);
};
