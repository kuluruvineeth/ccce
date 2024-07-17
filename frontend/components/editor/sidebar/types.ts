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

export type TTab = TFile & {
  saved: boolean;
};
