// The contents of namespaces that are not exported at the top-level should be flattened and tree shaken.

export const a = { namespaceInternalA: "namespace-internal.ts - a" }; // This is used by MyNamespace and should be kept. It's name will conflict with another top-level export, so one of them needs a disambiguator.
export const b = { namespaceInternalB: "namespace-internal.ts - b" }; // This is unused and should be dropped.
