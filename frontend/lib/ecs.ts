import { CreateServiceCommand, ECSClient } from "@aws-sdk/client-ecs";

const ecsClient = new ECSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIAZQ3DOPGVTMHESALR",
    secretAccessKey: "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",
  },
});

export default ecsClient;
