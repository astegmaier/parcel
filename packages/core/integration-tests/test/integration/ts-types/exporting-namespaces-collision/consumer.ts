import { NamespaceConflict } from "./exporter"

export const consumer: typeof NamespaceConflict.nameConflict = { messageFromOther2: "This variable uses the type of the nameConflict1 variable defined in other3.ts, which should now be declared in the bundle, but not exported." };
