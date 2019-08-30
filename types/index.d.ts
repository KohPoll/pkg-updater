declare module "pkg-updater" {
  type BaseOption = {
    pkg: {
      name: string;
      version: string;
    };
    updateMessage?: string;
    level?: "major" | "minor" | "patch" | "never";
  };

  export type VersionChangeOption = {
    incompatible: boolean;
    latestVersion: string;
  } & BaseOption;

  export type UpdaterOption = {
    registry?: string;
    tag?: string;
    checkInterval?: number;
    logFile?: string;
    onVersionChange?: (opt: VersionChangeOption) => IterableIterator<any>;
  } & BaseOption;

  export default function(option: UpdaterOption): Promise<void>;
}
