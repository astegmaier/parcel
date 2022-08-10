declare const baz: {
    messageFromOther: string;
};
declare const bar: {
    messageFromInternalNamespace: string;
};
export namespace MyNamespace2 {
    export const qux: {
        messageFromNamespace2: string;
    };
}
export namespace MyNamespace {
    export const foo: string;
    export const barConsumer: typeof bar;
    export const bazConsumer: typeof baz;
    export const quxConsumer: typeof MyNamespace2.qux;
}
export const barConsumer: typeof bar;
export const bazConsumer: typeof baz;

//# sourceMappingURL=types.d.ts.map
