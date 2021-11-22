declare module "MyNamespace" {
    export interface TestInterface {
        foo: number;
        bar: boolean;
    }
    export const testNumber: number;
    export const testString: string;
    export class TestClass {
        a: string
        b: number
    }
}

export const MyNamespace: import("MyNamespace");

//# sourceMappingURL=types.d.ts.map
