export type User = {
  id: string;
  name: string;
  email: string;
  generations: number;
  virtualbox: Virtualbox[];
  usersToVirtualboxes: UsersToVirtualboxes[];
};

export type Virtualbox = {
  id: string;
  name: string;
  type: "react" | "node";
  visibility: "public" | "private";
  userId: string;
  usersToVirtualboxes: UsersToVirtualboxes[];
};

export type UsersToVirtualboxes = {
  userId: string;
  virtualboxId: string;
};

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
