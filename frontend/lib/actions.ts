"use server";

import { revalidatePath } from "next/cache";
import {
  CreateServiceCommand,
  DescribeServicesCommand,
  ECSClient,
} from "@aws-sdk/client-ecs";
import ecsClient from "./ecs";

export async function createVirtualbox(body: {
  type: string;
  name: string;
  visibility: string;
}) {
  const res = await fetch(
    "https://database.cestorage.workers.dev/api/virtualbox",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  return await res.text();
}

export async function deleteVirtualbox(id: string) {
  const res = await fetch(
    `https://database.cestorage.workers.dev/api/virtualbox?id=${id}`,
    {
      method: "DELETE",
    }
  );

  revalidatePath("/dashboard");
}

export async function updateVirtualbox(body: {
  id: string;
  name?: string;
  visibility?: "public" | "private";
}) {
  const res = await fetch(
    "https://database.cestorage.workers.dev/api/virtualbox",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  revalidatePath("/dashboard");
}

export async function shareVirtualbox(virtualboxId: string, email: string) {
  try {
    const res = await fetch(
      "https://database.cestorage.workers.dev/api/virtualbox/share",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ virtualboxId, email }),
      }
    );
    const text = await res.text();

    if (res.status !== 200) {
      return { success: false, message: text };
    }

    revalidatePath(`/code/${virtualboxId}`);
    return { success: true, message: "Shared successfully" };
  } catch (err) {
    return { success: false, message: err };
  }
}

export async function unshareVirtualbox(virtualboxId: string, userId: string) {
  const res = await fetch(
    "https://database.cestorage.workers.dev/api/virtualbox/share",
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ virtualboxId, userId }),
    }
  );

  revalidatePath(`/code/${virtualboxId}`);
}

export async function generateCode(code: string, line: number) {
  const res = await fetch(
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
              "You are an expert coding assistant who reads from an existing code file, and suggests code to add to the file.",
          },
          {
            role: "user",
            content: "",
          },
        ],
      }),
    }
  );
}

export async function startServer(serviceName: string) {
  const command = new CreateServiceCommand({
    cluster: "arn:aws:ecs:us-east-1:654654208427:cluster/virtualboxccce",
    serviceName,
    taskDefinition: "cccetasks",
    desiredCount: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        securityGroups: ["sg-0b60193994bed8816"],
        subnets: [
          "subnet-0579b3a7463100753",
          "subnet-03fd1f4d91b5f5311",
          "subnet-052bb79f721ced4f6",
          "subnet-0fcf2238868a2e709",
          "subnet-0face6c4520a7bb9a",
          "subnet-0234c726980dc66b2",
        ],
        assignPublicIp: "ENABLED",
      },
    },
  });

  try {
    const response = await ecsClient.send(command);
    console.log("started server", response.service?.serviceName);
  } catch (err) {
    console.error("Error starting server:", err);
  }
}

const checkServiceStatus = (serviceName: string) => {
  return new Promise((resolve, reject) => {
    const command = new DescribeServicesCommand({
      cluster: "arn:aws:ecs:us-east-1:654654208427:cluster/virtualboxccce",
      services: [serviceName],
    });

    const interval = setInterval(async () => {
      try {
        const response = await ecsClient.send(command);
        console.log("Checking service status", response);

        if (response.services && response.services.length > 0) {
          const service = response.services?.[0];
          if (
            service.runningCount === service.desiredCount &&
            service.deployments &&
            service.deployments.length === 1 &&
            service.deployments[0].rolloutState === "COMPLETED"
          ) {
            clearInterval(interval);
            resolve(service);
          }
        }
      } catch (error) {
        clearInterval(interval);
        reject(error);
      }
    }, 5000);
  });
};
