# LLM Canvas Engine (LLMRT)

A tiny, dependency-free web runtime for JSON-based game cartridges, designed for reliable LLM content generation.

## Project Structure

```
src/
├── types/           # TypeScript type definitions
│   ├── core.ts      # Core engine interfaces
│   ├── actions.ts   # Action/trigger system types
│   ├── modules.ts   # Module system types
│   └── index.ts     # Type exports
├── core/            # Core engine implementation
│   ├── engine.ts    # Main LLMRTEngine implementation
│   ├── module-registry.ts # Module registration system
│   └── engine.test.ts # Core engine tests
└── index.ts         # Main entry point
```

## Build System

The project uses Rollup with TypeScript for tree-shaking optimization:

- **Development**: `npm run build:dev` - Builds with source maps
- **Production**: `npm run build` - Builds minified version
- **Testing**: `npm test` - Runs unit tests with Vitest
- **Type Checking**: `npm run typecheck` - Validates TypeScript

## Module System

The engine supports tree-shakeable modules through the `ModuleRegistry`:

```typescript
import { registerModule, registerRenderModule } from 'llm-canvas-engine';

// Register a module
registerModule({
  name: 'mode7',
  nodeTypes: ['Mode7Plane'],
  actions: ['setMode7Params'],
  triggers: [],
  dependencies: [],
  size: 5 // KB estimate
});
```

## Core Interfaces

- **LLMRTEngine**: Main engine interface for loading and controlling cartridges
- **LGFCartridge**: JSON cartridge format with scenes, assets, and metadata
- **Node**: Scene tree node with transform, actions, and triggers
- **ModuleRegistry**: System for registering optional modules

## Getting Started

```typescript
import { createEngine } from 'llm-canvas-engine';

const engine = createEngine();
await engine.loadCartridge(cartridge);
engine.start();
```