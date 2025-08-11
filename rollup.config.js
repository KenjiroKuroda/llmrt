import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const isDev = process.env.NODE_ENV === 'development';
const buildTarget = process.env.BUILD_TARGET || 'web-standard';

// Build target configurations
const buildTargets = {
  'mobile-minimal': {
    external: ['./modules/mode7.js', './modules/raycast.js', './modules/iso.js', './modules/postfx.js'],
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info']
      },
      mangle: {
        properties: {
          regex: /^_/
        }
      }
    }
  },
  'desktop-full': {
    external: [],
    terserOptions: {
      compress: {
        drop_debugger: true
      }
    }
  },
  'web-standard': {
    external: ['./modules/raycast.js', './modules/iso.js'],
    terserOptions: {
      compress: {
        drop_console: !isDev,
        drop_debugger: true
      }
    }
  }
};

const currentTarget = buildTargets[buildTarget] || buildTargets['web-standard'];

export default [
  // Main library build with optimization
  {
    input: 'src/index.ts',
    external: currentTarget.external,
    output: [
      {
        file: 'dist/llmrt.js',
        format: 'umd',
        name: 'LLMRT',
        sourcemap: isDev
      },
      {
        file: 'dist/llmrt.min.js',
        format: 'umd',
        name: 'LLMRT',
        plugins: isDev ? [] : [terser(currentTarget.terserOptions)],
        sourcemap: !isDev
      },
      {
        file: 'dist/llmrt.esm.js',
        format: 'es',
        sourcemap: isDev
      }
    ],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: './dist/types'
      }),
      // Custom tree-shaking plugin
      {
        name: 'optimize-build',
        generateBundle(options, bundle) {
          // Remove unused exports based on build target
          if (buildTarget === 'mobile-minimal') {
            console.log('Applying mobile optimizations...');
            // Additional mobile-specific optimizations would go here
          }
        }
      }
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false,
      unknownGlobalSideEffects: false,
      pureExternalModules: true
    }
  },
  // CLI tool build
  {
    input: 'src/cli/validator.ts',
    output: {
      file: 'dist/cli/validator.js',
      format: 'es',
      sourcemap: isDev
    },
    external: ['fs/promises', 'path', 'process'],
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  },
  // Playground build
  {
    input: 'src/playground/playground.ts',
    output: {
      file: 'dist/playground.js',
      format: 'es',
      sourcemap: isDev
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json'
      })
    ]
  }
];