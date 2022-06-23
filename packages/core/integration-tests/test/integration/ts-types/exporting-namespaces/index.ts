export * as MyNamespace from './other';

import { TestClass } from "./other"

export const testInstance: TestClass = new MyNamespace.TestClass();
