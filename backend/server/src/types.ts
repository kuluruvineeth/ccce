export type R2Files = {
  objects: R2FileData[];
  truncated: boolean;
  delimitedPrefixes: any[];
};

export type R2FileData = {
  storageClass: string;
  uploaded: string;
  checkSums: any;
  httpEtag: string;
  etag: string;
  size: number;
  version: string;
  key: string;
};

export type TFolder = {
  id: string;
  type: "folder";
  name: string;
  children: (TFolder | TFile)[];
};

export type TFile = {
  id: string;
  type: "file";
  name: string;
};

export type TFileData = {
  id: string;
  data: string;
};

export type R2FileBody = R2FileData & {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer: Promise<ArrayBuffer>;
  text: Promise<string>;
  json: Promise<any>;
  blob: Promise<Blob>;
};

export type User = {
  id: string;
  name: string;
  email: string;
  virtualbox: Virtualbox[];
  generations: number;
  usersToVirtualboxes: UsersToVirtualboxes[];
};

export type UsersToVirtualboxes = {
  userId: string;
  virtualboxId: string;
};

export type Virtualbox = {
  id: string;
  name: string;
  type: "react" | "node";
  visibility: "public" | "private";
  userId: string;
  usersToVirtualboxes: UsersToVirtualboxes[];
};
