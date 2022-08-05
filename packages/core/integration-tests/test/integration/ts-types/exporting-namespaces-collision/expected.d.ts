export namespace NamespaceConflict {
    export const nameConflict: {
        messageFromOther1: string;
    };
}
declare const nameConflict: {
    messageFromOther2: string;
};
export const consumer: typeof nameConflict;

//# sourceMappingURL=types.d.ts.map
