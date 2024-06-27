declare module '*.ne' {
  import type { CompiledRules } from 'nearley';

  const compiledRules: CompiledRules;
  export default compiledRules;
}

declare module '*.template' {
  const content: string;
  export default content;
}
