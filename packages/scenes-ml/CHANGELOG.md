# v1.0.0 (Tue Sep 22 2026)

### Release Notes

#### chore(deps): update dependency esbuild to ^0.28.1 ([#165](https://github.com/grafana/scenes-ml/pull/165))

<details>
<summary>evanw/esbuild (esbuild)</summary>

### [`v0.28.2`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0282)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.28.1...v0.28.2)

- Fix tree shaking bug due to TypeScript import alias ([#&#8203;4507](https://redirect.github.com/evanw/esbuild/issues/4507))

  This release fixes a bug that could cause esbuild to incorrectly tree-shake imports that are used in a TypeScript type alias under certain circumstances. Affected code uses a TypeScript-specific `import` assignment and looks something like this:

  ```ts
  import Base from './dep.js';
  import Alias = Base.SomeType;
  ```

- Fix CSS minification bug involving `&` ([#&#8203;4497](https://redirect.github.com/evanw/esbuild/issues/4497))

  This release fixes a bug where esbuild's CSS minifier incorrectly removed a `&` when it was unsafe to do so. Here is an example:

  ```css
  /* Original code */
  .a .b {
    & .b:not(& .c) {
      color: red;
    }
  }

  /* Old output (with --minify) */
  .a .b{.b:not(& .c){color:red}}

  /* New output (with --minify) */
  .a .b{& .b:not(& .c){color:red}}
  ```

  This should match `<span class="a"><span class="b"><span class="b">yes</span></span></span>` but not `<span class="a"><span class="b">no</span></span>`. The old output incorrectly matched both.

- Avoid overwriting input files without `--allow-overwrite` ([#&#8203;4484](https://redirect.github.com/evanw/esbuild/issues/4484))

  For example: `esbuild input.js --outfile=input.js` tells esbuild to overwrite `input.js` with the output of running esbuild on it. This was supposed to already be prevented by default, but it accidentally regressed in version 0.17.0 and apparently didn't have any test coverage. The error message was being printed but the input file was still being overwritten. Oops.

  This release puts the original behavior back. With this release, esbuild should now actually avoid overwriting input files unless `--allow-overwrite` is explicitly present. This is done by not writing out any files when a build error is encountered.

- Fix incorrect code generated when using top-level await ([#&#8203;4498](https://redirect.github.com/evanw/esbuild/issues/4498))

  Previously esbuild could generate code containing a syntax error in complex scenarios involving top-level await used in a dependency cycle. The problem was a missing `async` on one or more module wrapper closures. With this release, esbuild now uses a fixed-point iteration algorithm to correctly annotate all dependencies in the cycle as needing an `async` module wrapper.

- Fix a minification bug with lowered logical assignment operators ([#&#8203;4508](https://redirect.github.com/evanw/esbuild/issues/4508))

  This release fixes a bug that could cause esbuild to generate incorrect code for logical assignment operators when lowering them to an older target environment. Specifically the lowering process requires duplicating the left-hand side, but esbuild incorrectly failed to count the duplicate as a new usage when the left-hand side is an identifier. That then caused the minifier to believe that the left-hand side was only used once and could attempt to incorrectly inline an initializer into the first usage. This bug has now been fixed:

  ```js
  // Original code
  function foo() {
    let x
    bar(x ||= {})
  }

  // Old output (with --minify-syntax --target=es6)
  function foo() {
    bar(void 0 || (x = {}));
  }

  // New output (with --minify-syntax --target=es6)
  function foo() {
    let x;
    bar(x || (x = {}));
  }
  ```

- Fix a potential deadlock when the JavaScript API is used incorrectly ([#&#8203;4503](https://redirect.github.com/evanw/esbuild/issues/4503), [#&#8203;4506](https://redirect.github.com/evanw/esbuild/pull/4506))

  The JavaScript API runs the native esbuild executable as a long-lived child process and communicates with it over stdin/stdout/stderr. Each API request is asynchronous and the executable stays open as long as it has work to do, which is as long as either stdin is still open (meaning there may be more API requests) or there are currently requests being processed.

  Previously esbuild's tracking of outstanding API requests missed decrementing a reference count in an edge case where esbuild's JavaScript API was used incorrectly and the API request returned an error. This could in some cases cause esbuild's native executable to exit with an error message about a deadlock. This release fixes the reference counting bug.

  This fix was submitted by [@&#8203;ZuBB](https://redirect.github.com/ZuBB).

- Handle target collisions ([#&#8203;4509](https://redirect.github.com/evanw/esbuild/issues/4509))

  It's possible to specify the same target engine multiple times, such as with `--target=chrome1,chrome99`. This edge case wasn't anticipated and previously took the last version for the duplicated target engine instead of the minimum version (so `chrome99` in this case instead of `chrome1`). With this release, esbuild will now pick the minimum version between all duplicated target engines.

- Force `.mp3` files to use the `audio/mpeg` MIME type ([#&#8203;4485](https://redirect.github.com/evanw/esbuild/issues/4485))

  MIME type detection for esbuild's data URLs uses Go's built-in MIME type detection, which is based on the [MIME sniffing standard](https://mimesniff.spec.whatwg.org/). This works correctly for MP3 files that start with the byte sequence `ID3`, which is commonly the case. However, it's possible to construct valid MP3 files that do not start with `ID3`, and that perhaps Go's built-in MIME type detection doesn't implement the "Signature for MP3 without ID3" part of the algorithm. This results in some `.mp3` files incorrectly using the `application/octet-stream` MIME type instead of `audio/mpeg`. With this release, esbuild will now always use the `audio/mpeg` MIME type for files ending in `.mp3`.

- Add a new TypeScript syntax warning

  TypeScript 7 turned some previously-valid TypeScript syntax into a syntax error because it was confusing. TypeScript 6 accepts `1 + 2 as number * 3` as valid syntax but confusingly converts it to `(1 + 2) * 3` instead of the more intuitive conversion to `1 + (2 * 3)`. This syntax is now an error in TypeScript 7+. With this release, esbuild will now warn about the use of this syntax:

  ```ts
  ▲ [WARNING] Operator "*" should not directly follow a TypeScript type cast after the "+" operator [confusing-typescript-cast]

      example.ts:1:28:
        1 │ console.log(1 + 2 as number * 3)
          ╵                             ^

    This is a syntax error in newer versions of TypeScript because the type cast has unintuitive
    precedence in this case. Surround the inner expression in parentheses to silence this warning:

      example.ts:1:12:
        1 │ console.log(1 + 2 as number * 3)
          │             ~~~~~~~~~~~~~~~
          ╵             (             )
  ```

  See [microsoft/TypeScript#63527](https://redirect.github.com/microsoft/TypeScript/issues/63527) for more information.

- Add support for formatting errors for Visual Studio ([#&#8203;4460](https://redirect.github.com/evanw/esbuild/issues/4460))

  Visual Studio has a specific style that it expects log messages to be in for them to show up in the UI when esbuild is run as a custom build step. The current log style that esbuild uses doesn't conform to this specific style.

  With this release, esbuild has a new log style for Visual Studio (and other tools in the MSBuild ecosystem) that can be enabled with `--log-style=visualstudio`. Here is an example log message in this style:

  ```
  $ esbuild example.ts --log-style=visualstudio
  /Users/evan/dev/esbuild/example.ts(1,29): warning ES0010: Operator "*" should not directly follow a TypeScript type cast after the "+" operator
  ```

  This log style is also available via the JS and Go APIs, and can now be used with the existing `formatMessages` API.

- Fix a bug with CSS gamut mapping ([#&#8203;4488](https://redirect.github.com/evanw/esbuild/pull/4488))

  Due to a typo, the fallback colors generated for CSS colors outside of the sRGB gamut weren't correct. This release fixes the generated colors to use the intended algorithm.

  This fix was submitted by [@&#8203;chatman-media](https://redirect.github.com/chatman-media).

</details>

---

#### fix(security/low/packages/scenes-ml): update dependency esbuild to ^0.28.0 [security] ([#152](https://github.com/grafana/scenes-ml/pull/152))

<details>
<summary>evanw/esbuild (esbuild)</summary>

### [`v0.28.1`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0281)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.28.0...v0.28.1)

- Disallow `\` in local development server HTTP requests ([GHSA-g7r4-m6w7-qqqr](https://redirect.github.com/evanw/esbuild/security/advisories/GHSA-g7r4-m6w7-qqqr))

  This release fixes a security issue where HTTP requests to esbuild's local development server could traverse outside of the serve directory on Windows using a `\` backslash character. It happened due to the use of Go's `path.Clean()` function, which only handles Unix-style `/` characters. HTTP requests with paths containing `\` are no longer allowed.

  Thanks to [@&#8203;dellalibera](https://redirect.github.com/dellalibera) for reporting this issue.

- Add integrity checks to the Deno API ([GHSA-gv7w-rqvm-qjhr](https://redirect.github.com/evanw/esbuild/security/advisories/GHSA-gv7w-rqvm-qjhr))

  The previous release of esbuild added integrity checks to esbuild's npm install script. This release also adds integrity checks to esbuild's Deno install script. Now esbuild's Deno API will also fail with an error if the downloaded esbuild binary contains something other than the expected content.

  Note that esbuild's Deno API installs from `registry.npmjs.org` by default, but allows the `NPM_CONFIG_REGISTRY` environment variable to override this with a custom package registry. This change means that the esbuild executable served by `NPM_CONFIG_REGISTRY` must now match the expected content.

  Thanks to [@&#8203;sondt99](https://redirect.github.com/sondt99) for reporting this issue.

- Avoid inlining `using` and `await using` declarations ([#&#8203;4482](https://redirect.github.com/evanw/esbuild/issues/4482))

  Previously esbuild's minifier sometimes incorrectly inlined `using` and `await using` declarations into subsequent uses of that declaration, which then fails to dispose of the resource correctly. This bug happened because inlining was done for `let` and `const` declarations by avoiding doing it for `var` declarations, which no longer worked when more declaration types were added. Here's an example:

  ```js
  // Original code
  {
    using x = new Resource()
    x.activate()
  }

  // Old output (with --minify)
  new Resource().activate();

  // New output (with --minify)
  {using e=new Resource;e.activate()}
  ```

- Fix module evaluation when an error is thrown ([#&#8203;4461](https://redirect.github.com/evanw/esbuild/issues/4461), [#&#8203;4467](https://redirect.github.com/evanw/esbuild/pull/4467))

  If an error is thrown during module evaluation, esbuild previously didn't preserve the state of the module for subsequent module references. This was observable if `import()` or `require()` is used to import a module multiple times. The thrown error is supposed to be thrown by every call to `import()` or `require()`, not just the first. With this release, esbuild will now throw the same error every time you call `import()` or `require()` on a module that throws during its evaluation.

- Fix some edge cases around the `new` operator ([#&#8203;4477](https://redirect.github.com/evanw/esbuild/issues/4477))

  Previously esbuild incorrectly printed certain edge cases involving complex expressions inside the target of a `new` expression (specifically an optional chain and/or a tagged template literal). The generated code for the `new` target was not correctly wrapped with parentheses, and either contained a syntax error or had different semantics. These edge cases have been fixed so that they now correctly wrap the `new` target in parentheses. Here is an example of some affected code:

  ```js
  // Original code
  new (foo()`bar`)()
  new (foo()?.bar)()

  // Old output
  new foo()`bar`();
  new (foo())?.bar();

  // New output
  new (foo())`bar`();
  new (foo()?.bar)();
  ```

- Fix renaming of nested `var` declarations ([#&#8203;4471](https://redirect.github.com/evanw/esbuild/issues/4471))

  This release fixes a bug where `var` declarations in nested scopes that are hoisted up to module scope were not correctly being renamed during bundling. That could previously lead to name collisions when minification was disabled, which could potentially cause a behavior change. The bug has been fixed so that these hoisted declarations are now considered to be module-level symbols during the name collision avoidance pass.

- Emit `var` instead of `const` for certain TypeScript-only constructs for ES5 ([#&#8203;4448](https://redirect.github.com/evanw/esbuild/issues/4448))

  While esbuild doesn't generally support converting `const` to `var` for ES5 due to nested scoping rules (which is currently a build-time error), esbuild previously incorrectly converted TypeScript-only `import` assignment constructs into a `const` declaration even when targeting ES5. With this release, esbuild will now use `var` for this case instead:

  ```js
  // Original code
  import x = require('y')

  // Old output (with --target=es5)
  const x = require("y");

  // New output (with --target=es5)
  var x = require("y");
  ```

### [`v0.28.0`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0280)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.7...v0.28.0)

- Add support for `with { type: 'text' }` imports ([#&#8203;4435](https://redirect.github.com/evanw/esbuild/issues/4435))

  The [import text](https://redirect.github.com/tc39/proposal-import-text) proposal has reached stage 3 in the TC39 process, which means that it's recommended for implementation. It has also already been implemented by [Deno](https://docs.deno.com/examples/importing_text/) and [Bun](https://bun.com/docs/guides/runtime/import-html). So with this release, esbuild also adds support for it. This behaves exactly the same as esbuild's existing [`text` loader](https://esbuild.github.io/content-types/#text). Here's an example:

  ```js
  import string from './example.txt' with { type: 'text' }
  console.log(string)
  ```

- Add integrity checks to fallback download path ([#&#8203;4343](https://redirect.github.com/evanw/esbuild/issues/4343))

  Installing esbuild via npm is somewhat complicated with several different edge cases (see [esbuild's documentation](https://esbuild.github.io/getting-started/#additional-npm-flags) for details). If the regular installation of esbuild's platform-specific package fails, esbuild's install script attempts to download the platform-specific package itself (first with the `npm` command, and then with a HTTP request to `registry.npmjs.org` as a last resort).

  This last resort path previously didn't have any integrity checks. With this release, esbuild will now verify that the hash of the downloaded binary matches the expected hash for the current release. This means the hashes for all of esbuild's platform-specific binary packages will now be embedded in the top-level `esbuild` package. Hopefully this should work without any problems. But just in case, this change is being done as a breaking change release.

- Update the Go compiler from 1.25.7 to 1.26.1

  This upgrade should not affect anything. However, there have been some significant internal changes to the Go compiler, so esbuild could potentially behave differently in certain edge cases:

  - It now uses the [new garbage collector](https://go.dev/doc/go1.26#new-garbage-collector) that comes with Go 1.26.
  - The Go compiler is now more aggressive with allocating memory on the stack.
  - The executable format that the Go linker uses has undergone several changes.
  - The WebAssembly build now unconditionally makes use of the sign extension and non-trapping floating-point to integer conversion instructions.

  You can read the [Go 1.26 release notes](https://go.dev/doc/go1.26) for more information.

### [`v0.27.7`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0277)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.5...v0.27.7)

- Fix lowering of define semantics for TypeScript parameter properties ([#&#8203;4421](https://redirect.github.com/evanw/esbuild/issues/4421))

  The previous release incorrectly generated class fields for TypeScript parameter properties even when the configured target environment does not support class fields. With this release, the generated class fields will now be correctly lowered in this case:

  ```ts
  // Original code
  class Foo {
    constructor(public x = 1) {}
    y = 2
  }

  // Old output (with --loader=ts --target=es2021)
  class Foo {
    constructor(x = 1) {
      this.x = x;
      __publicField(this, "y", 2);
    }
    x;
  }

  // New output (with --loader=ts --target=es2021)
  class Foo {
    constructor(x = 1) {
      __publicField(this, "x", x);
      __publicField(this, "y", 2);
    }
  }
  ```

### [`v0.27.5`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0275)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.4...v0.27.5)

- Fix for an async generator edge case ([#&#8203;4401](https://redirect.github.com/evanw/esbuild/issues/4401), [#&#8203;4417](https://redirect.github.com/evanw/esbuild/pull/4417))

  Support for transforming async generators into the equivalent state machine was added in version 0.19.0. However, the generated state machine didn't work correctly when polling async generators concurrently, such as in the following code:

  ```js
  async function* inner() { yield 1; yield 2 }
  async function* outer() { yield* inner() }
  let gen = outer()
  for await (let x of [gen.next(), gen.next()]) console.log(x)
  ```

  Previously esbuild's output of the above code behaved incorrectly when async generators were transformed (such as with `--supported:async-generator=false`). The transformation should be fixed starting with this release.

  This fix was contributed by [@&#8203;2767mr](https://redirect.github.com/2767mr).

- Fix a regression when `metafile` is enabled ([#&#8203;4420](https://redirect.github.com/evanw/esbuild/issues/4420), [#&#8203;4418](https://redirect.github.com/evanw/esbuild/pull/4418))

  This release fixes a regression introduced by the previous release. When `metafile: true` was enabled in esbuild's JavaScript API, builds with build errors were incorrectly throwing an error about an empty JSON string instead of an object containing the build errors.

- Use define semantics for TypeScript parameter properties ([#&#8203;4421](https://redirect.github.com/evanw/esbuild/issues/4421))

  Parameter properties are a TypeScript-specific code generation feature that converts constructor parameters into class fields when they are prefixed by certain keywords. When `"useDefineForClassFields": true` is present in `tsconfig.json`, the TypeScript compiler automatically generates class field declarations for parameter properties. Previously esbuild didn't do this, but esbuild will now do this starting with this release:

  ```ts
  // Original code
  class Foo {
    constructor(public x: number) {}
  }

  // Old output (with --loader=ts)
  class Foo {
    constructor(x) {
      this.x = x;
    }
  }

  // New output (with --loader=ts)
  class Foo {
    constructor(x) {
      this.x = x;
    }
    x;
  }
  ```

- Allow `es2025` as a target in `tsconfig.json` ([#&#8203;4432](https://redirect.github.com/evanw/esbuild/issues/4432))

  TypeScript recently [added `es2025`](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/#es2025-option-for-target-and-lib) as a compilation target, so esbuild now supports this in the `target` field of `tsconfig.json` files, such as in the following configuration file:

  ```json
  {
    "compilerOptions": {
      "target": "ES2025"
    }
  }
  ```

  As a reminder, the only thing that esbuild uses this field for is determining whether or not to use legacy TypeScript behavior for class fields. You can read more in [the documentation](https://esbuild.github.io/content-types/#tsconfig-json).

</details>

---

#### chore(deps): update swc monorepo ([#143](https://github.com/grafana/scenes-ml/pull/143))

<details>
<summary>swc-project/swc (@&#8203;swc/core)</summary>

### [`v1.16.2`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1162---2026-09-04)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.16.1...v1.16.2)

##### Bug Fixes

- **(es/compat)** Preserve for-of var binding scope ([#&#8203;12158](https://redirect.github.com/swc-project/swc/issues/12158)) ([f6d5bd1](https://redirect.github.com/swc-project/swc/commit/f6d5bd12bf267dbb2e1551ccacd82b198e6edc6f))

- **(es/decorators)** Drop params from getter replacing decorated private method ([#&#8203;12161](https://redirect.github.com/swc-project/swc/issues/12161)) ([d56f594](https://redirect.github.com/swc-project/swc/commit/d56f5943861178b91ff6e718bddb10e997da1a8c))

- **(es/flow)** Preserve Flow component type semantics ([#&#8203;12090](https://redirect.github.com/swc-project/swc/issues/12090)) ([c8d5b49](https://redirect.github.com/swc-project/swc/commit/c8d5b497c4895367b0902bde42b3f6a3fa5b7c24))

- **(es/minifier)** Mark for update and test as executed multiple time ([#&#8203;12131](https://redirect.github.com/swc-project/swc/issues/12131)) ([1260e36](https://redirect.github.com/swc-project/swc/commit/1260e362fd9bb15cf93b2d3ce595290c7ff272cf))

- **(es/minifier)** Report for loop var decl as assign ([#&#8203;12136](https://redirect.github.com/swc-project/swc/issues/12136)) ([783bbc2](https://redirect.github.com/swc-project/swc/commit/783bbc29c8ccbc7d2dfa73860dd2765ee09d459d))

- **(es/minifier)** Don't replace value-used console.\*.bind() calls with undefined ([#&#8203;12138](https://redirect.github.com/swc-project/swc/issues/12138)) ([ed74223](https://redirect.github.com/swc-project/swc/commit/ed742230471f5462da9f24a8a4c1566d8fa8ef68))

- **(es/minifier)** Drop spans of cached `globals` values ([#&#8203;12129](https://redirect.github.com/swc-project/swc/issues/12129)) ([9a306b8](https://redirect.github.com/swc-project/swc/commit/9a306b890ac9d4fc8698faf6c55ff95e82983585))

- **(es/minifier)** Preserve effects of returned value calls ([#&#8203;12140](https://redirect.github.com/swc-project/swc/issues/12140)) ([c37b5a9](https://redirect.github.com/swc-project/swc/commit/c37b5a954794cf0e4cfa419868899385f067bc05))

- **(es/minifier)** Avoid JSX sequence inlining loop ([#&#8203;12149](https://redirect.github.com/swc-project/swc/issues/12149)) ([4e79b94](https://redirect.github.com/swc-project/swc/commit/4e79b94930d7fc21b794f3c480fea4c9f8f8344e))

- **(es/minifier)** Preserve bindings in copied inline arrows ([#&#8203;12141](https://redirect.github.com/swc-project/swc/issues/12141)) ([cf7b5c9](https://redirect.github.com/swc-project/swc/commit/cf7b5c96430be5fc5fab4820c6bf75eb53f5c712))

- **(es/minifier)** Preserve do-while control-flow targets ([#&#8203;12160](https://redirect.github.com/swc-project/swc/issues/12160)) ([f62c437](https://redirect.github.com/swc-project/swc/commit/f62c437dc2546d8cf3aa8211970f72693a357d0c))

- **(es/minifier)** Preserve pure annotation ownership ([#&#8203;12180](https://redirect.github.com/swc-project/swc/issues/12180)) ([ec780f9](https://redirect.github.com/swc-project/swc/commit/ec780f927369cc81dfa3a1aca73802d7e5885a96))

- **(es/parser)** Retry ambiguous Program parsing ([#&#8203;12142](https://redirect.github.com/swc-project/swc/issues/12142)) ([141a320](https://redirect.github.com/swc-project/swc/commit/141a3201322dd3cf1acb317fe1c8889cdeda9358))

- **(es/parser)** Preserve await grammar boundaries ([#&#8203;12156](https://redirect.github.com/swc-project/swc/issues/12156)) ([c732683](https://redirect.github.com/swc-project/swc/commit/c7326832e57d2d3effe9eb1b3c415424ae68bf21))

- **(es/quote)** Restore await parsing ([#&#8203;12163](https://redirect.github.com/swc-project/swc/issues/12163)) ([918f517](https://redirect.github.com/swc-project/swc/commit/918f5174a17425cd49c3eedc1e761ebdf1fc3d2e))

- **(es/typescript)** Treat const variable references as enum constants ([#&#8203;12101](https://redirect.github.com/swc-project/swc/issues/12101)) ([c523551](https://redirect.github.com/swc-project/swc/commit/c5235516340959f703c02d91a79ba40df897eb9c))

- **(swc)** Key optimizer env cache by configured values ([#&#8203;12166](https://redirect.github.com/swc-project/swc/issues/12166)) ([c0b6f12](https://redirect.github.com/swc-project/swc/commit/c0b6f12fe4c3b1d0235a64496560941751e21bd8))

- **(visit)** Panic on invalid AST paths ([#&#8203;12154](https://redirect.github.com/swc-project/swc/issues/12154)) ([b4d11a9](https://redirect.github.com/swc-project/swc/commit/b4d11a99fd79c54486a9466c1477a9eb0e07b443))

##### Features

- **(es/minifier)** Evaluate Math.floor, Math.ceil, Math.round and Mat… ([#&#8203;12117](https://redirect.github.com/swc-project/swc/issues/12117)) ([e876e80](https://redirect.github.com/swc-project/swc/commit/e876e80f6652d2cc96709678ee8ee213dc06b94e))

- **(es/parser)** Add opt-in parser-only TSRX lowering ([#&#8203;12120](https://redirect.github.com/swc-project/swc/issues/12120)) ([61ff097](https://redirect.github.com/swc-project/swc/commit/61ff097706c3fb0568f92bb6e9b2565d87ce3e4f))

##### Miscellaneous Tasks

- **(deps)** Upgrade reqwest to 0.12 ([#&#8203;12144](https://redirect.github.com/swc-project/swc/issues/12144)) ([8dd98e4](https://redirect.github.com/swc-project/swc/commit/8dd98e45092289eeadf3e3255c9de9323f2944f6))

- **(deps)** Ignore unpatched Wasmtime advisory ([#&#8203;12170](https://redirect.github.com/swc-project/swc/issues/12170)) ([5dd7422](https://redirect.github.com/swc-project/swc/commit/5dd7422d5bd4e3cdfef14402477f01da662bfe48))

##### Refactor

- **(react-compiler)** Use official packages ([#&#8203;12168](https://redirect.github.com/swc-project/swc/issues/12168)) ([6d34fe7](https://redirect.github.com/swc-project/swc/commit/6d34fe730c1410849210d5e7186331b08c93f2d6))

##### Testing

- **(es/minifier)** Update test fixtures ([#&#8203;12135](https://redirect.github.com/swc-project/swc/issues/12135)) ([2f3e88d](https://redirect.github.com/swc-project/swc/commit/2f3e88d76b0f18ba50c9ad9085a87d9916aace5f))

##### Ci

- Only plan completed issues and merged PRs ([#&#8203;12133](https://redirect.github.com/swc-project/swc/issues/12133)) ([4d9aa8e](https://redirect.github.com/swc-project/swc/commit/4d9aa8e3971b21fca583069d3c6d46d1e15e1213))

- Gate jobs with detected changes ([#&#8203;12147](https://redirect.github.com/swc-project/swc/issues/12147)) ([3802924](https://redirect.github.com/swc-project/swc/commit/380292485239ad8b19aabdfcc0f77701844f6051))

- Tag published misc npm packages ([#&#8203;12173](https://redirect.github.com/swc-project/swc/issues/12173)) ([a789691](https://redirect.github.com/swc-project/swc/commit/a7896914a2c72c618f28e726b49e658e010eefc6))

### [`v1.16.1`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1161---2026-08-19)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.16.0...v1.16.1)

##### Bug Fixes

- **(es/minifier)** Preserve for init ([#&#8203;12121](https://redirect.github.com/swc-project/swc/issues/12121)) ([0a1d4de](https://redirect.github.com/swc-project/swc/commit/0a1d4de3c6439770aa718b488d87ac9a29d3d92a))

- **(es/modules)** Preserve destructuring assignment targets in SystemJS ([#&#8203;12122](https://redirect.github.com/swc-project/swc/issues/12122)) ([557060b](https://redirect.github.com/swc-project/swc/commit/557060b72a2138c37a76114a1a2862390246a500))

- **(es/react)** Handle apos JSX entities ([#&#8203;12125](https://redirect.github.com/swc-project/swc/issues/12125)) ([d09547f](https://redirect.github.com/swc-project/swc/commit/d09547fbd99915d1063e3513d1a99cd9e2aeda7e))

### [`v1.16.0`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1160---2026-08-14)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.47...v1.16.0)

##### Bug Fixes

- **(encoding)** Fix incorrect fields count ([#&#8203;11905](https://redirect.github.com/swc-project/swc/issues/11905)) ([6fb4ca1](https://redirect.github.com/swc-project/swc/commit/6fb4ca16332f862e71f149f19da55147f12a0c80))
  - **BREAKING**: Fix incorrect fields count ([#&#8203;11905](https://redirect.github.com/swc-project/swc/issues/11905))

- **(es/ast)** Prevent mutable reference escape ([#&#8203;12088](https://redirect.github.com/swc-project/swc/issues/12088)) ([592f559](https://redirect.github.com/swc-project/swc/commit/592f559787e62f091cbe5c4c370b2ff30e4abd34))

- **(es/ast)** Fix panic on JSX surrogate entities ([#&#8203;11803](https://redirect.github.com/swc-project/swc/issues/11803)) ([d21de47](https://redirect.github.com/swc-project/swc/commit/d21de4761a5306be015b2b9021fbc3cc9d02f13b))
  - **BREAKING**: fix panic on JSX surrogate entities ([#&#8203;11803](https://redirect.github.com/swc-project/swc/issues/11803))

- **(es/es2015)** Preserve this in static field parameters ([#&#8203;12085](https://redirect.github.com/swc-project/swc/issues/12085)) ([5b758ed](https://redirect.github.com/swc-project/swc/commit/5b758ed173292dccf4d97d372a36a4086a820a7c))

- **(es/minifier)** Remove unused variable initializer cycles ([#&#8203;12106](https://redirect.github.com/swc-project/swc/issues/12106)) ([0421534](https://redirect.github.com/swc-project/swc/commit/0421534a522d3c7b4b5aeb71b44751bb8aa90979))

- **(es/minifier)** Bound arguments parameter injection ([#&#8203;12053](https://redirect.github.com/swc-project/swc/issues/12053)) ([46d6f41](https://redirect.github.com/swc-project/swc/commit/46d6f41ccec6ce9d97baad4e16c1bdc8e24d77db))

- **(es/preset-env)** Lower unsupported async generators ([#&#8203;12086](https://redirect.github.com/swc-project/swc/issues/12086)) ([3a144b1](https://redirect.github.com/swc-project/swc/commit/3a144b1caa98d48b0adcb4ca824ee7c22ad7f702))

- **(hstr)** Avoid references to uninitialized bytes ([#&#8203;12087](https://redirect.github.com/swc-project/swc/issues/12087)) ([68f0983](https://redirect.github.com/swc-project/swc/commit/68f0983877976a379cb0249c7af21898505313be))

- **(plugin)** Make raw byte reconstruction unsafe ([#&#8203;12089](https://redirect.github.com/swc-project/swc/issues/12089)) ([83ab4ed](https://redirect.github.com/swc-project/swc/commit/83ab4ed6fd19782342f221bfaf05177508b73217))

- **(plugin/runner)** Write Wasmer cache atomically ([#&#8203;12100](https://redirect.github.com/swc-project/swc/issues/12100)) ([3c4f404](https://redirect.github.com/swc-project/swc/commit/3c4f404bb3f54fd8a25eb9399b84a86bb3fc26fe))

- **(react-compiler)** Make fast check conservative ([#&#8203;12105](https://redirect.github.com/swc-project/swc/issues/12105)) ([7e14950](https://redirect.github.com/swc-project/swc/commit/7e149500d84ae4ea3f4f43aa1b29e97b891739ad))

- **(react-compiler)** Preserve TypeScript function overload signatures ([#&#8203;12115](https://redirect.github.com/swc-project/swc/issues/12115)) ([a132384](https://redirect.github.com/swc-project/swc/commit/a1323843cb3389250eafcf53f027314515aff549))

##### Miscellaneous Tasks

- **(deps)** Update browserslist-rs to 0.20 ([#&#8203;12098](https://redirect.github.com/swc-project/swc/issues/12098)) ([b395eab](https://redirect.github.com/swc-project/swc/commit/b395eabee58ec2735c09e4f29267f55cdbdde18c))

- **(deps)** Update lru to 0.18.2 to fix cargo deny ([#&#8203;12116](https://redirect.github.com/swc-project/swc/issues/12116)) ([c9d1da4](https://redirect.github.com/swc-project/swc/commit/c9d1da49161d0dc32e3f83387a0c200630f059f2))

##### Refactor

- **(es/ast)** Add `body_ctxt` to `Switch` ([#&#8203;12065](https://redirect.github.com/swc-project/swc/issues/12065)) ([bf25ae0](https://redirect.github.com/swc-project/swc/commit/bf25ae01aa950185c41edaacfddae644f2ab4581))
  - **BREAKING**: Add `body_ctxt` to `Switch` ([#&#8203;12065](https://redirect.github.com/swc-project/swc/issues/12065))

- **(es/ast)** Split TypeScript this parameters ([#&#8203;12075](https://redirect.github.com/swc-project/swc/issues/12075)) ([1687c0f](https://redirect.github.com/swc-project/swc/commit/1687c0fbd2f22c563e02f5f3efa8d5e4f0772e12))
  - **BREAKING**: split TypeScript this parameters ([#&#8203;12075](https://redirect.github.com/swc-project/swc/issues/12075))

- **(es/ast)** Use Function for object accessors ([#&#8203;12077](https://redirect.github.com/swc-project/swc/issues/12077)) ([9ae902e](https://redirect.github.com/swc-project/swc/commit/9ae902e3fe9771c75c116546dc36ac90e481c316))
  - **BREAKING**: use Function for object accessors ([#&#8203;12077](https://redirect.github.com/swc-project/swc/issues/12077))

- **(es/ast)** Introduce FunctionBody ([#&#8203;12096](https://redirect.github.com/swc-project/swc/issues/12096)) ([394c7c9](https://redirect.github.com/swc-project/swc/commit/394c7c926edd4f779d09ba00612f8b8baab4907a))
  - **BREAKING**: introduce FunctionBody ([#&#8203;12096](https://redirect.github.com/swc-project/swc/issues/12096))

### [`v1.15.47`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11547---2026-07-29)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.46...v1.15.47)

##### Bug Fixes

- **(es)** Preserve numeric property key identity ([#&#8203;12050](https://redirect.github.com/swc-project/swc/issues/12050)) ([46900a3](https://redirect.github.com/swc-project/swc/commit/46900a31a92bdb89de94bf9264606342ec201fd3))

- **(es/ast)** Support hashing non-finite numbers ([#&#8203;12043](https://redirect.github.com/swc-project/swc/issues/12043)) ([f4b85a6](https://redirect.github.com/swc-project/swc/commit/f4b85a63e9546245782068f5a9b2b7a0991cb99c))

- **(es/codegen)** Emit non-finite numeric literals ([#&#8203;12047](https://redirect.github.com/swc-project/swc/issues/12047)) ([883abc4](https://redirect.github.com/swc-project/swc/commit/883abc4b97bf73a71cf1f6717238d24603ea9eb8))

- **(es/decorators)** Avoid class state leakage for nested undecorated classes ([#&#8203;12076](https://redirect.github.com/swc-project/swc/issues/12076)) ([4c9d277](https://redirect.github.com/swc-project/swc/commit/4c9d27752e9889b989cff9f6b72118e240048a23))

- **(es/minifier)** Apply ToInt32 when folding bitwise NOT ([#&#8203;12058](https://redirect.github.com/swc-project/swc/issues/12058)) ([550e2f7](https://redirect.github.com/swc-project/swc/commit/550e2f7881cdf2c3369a649afebd1b016485da81))

- **(es/minifier)** Avoid inexact number radix folding ([#&#8203;12057](https://redirect.github.com/swc-project/swc/issues/12057)) ([506a0ea](https://redirect.github.com/swc-project/swc/commit/506a0ea89b929733fa2530181542942157ee24fb))

- **(es/minifier)** Preserve invalid Array lengths ([#&#8203;12056](https://redirect.github.com/swc-project/swc/issues/12056)) ([3ce9e16](https://redirect.github.com/swc-project/swc/commit/3ce9e1693ec9586ab04b4ef9776be1233708e923))

- **(es/minifier)** Preserve non-canonical arguments access ([#&#8203;12052](https://redirect.github.com/swc-project/swc/issues/12052)) ([850230b](https://redirect.github.com/swc-project/swc/commit/850230b22b6a10c025a47efaaadb6b81b5fce5e7))

- **(es/minifier)** Apply ToUint16 in fromCharCode ([#&#8203;12055](https://redirect.github.com/swc-project/swc/issues/12055)) ([9ae7b92](https://redirect.github.com/swc-project/swc/commit/9ae7b9239fefc9eb781093eed5cd409bc31f34ad))

- **(es/minifier)** Index strings by UTF-16 code unit ([#&#8203;12054](https://redirect.github.com/swc-project/swc/issues/12054)) ([bc263d2](https://redirect.github.com/swc-project/swc/commit/bc263d24d5f3630188751c85757f5f7e31f9fbc2))

- **(es/minifier)** Use numeric literals for non-finite values ([#&#8203;12048](https://redirect.github.com/swc-project/swc/issues/12048)) ([b830786](https://redirect.github.com/swc-project/swc/commit/b83078644a7f0f1bbb56d6b45754ca9ed1bafc4b))

- **(es/minifier)** Preserve top-level declarations referenced only by direct eval ([#&#8203;12029](https://redirect.github.com/swc-project/swc/issues/12029)) ([ad0e3b4](https://redirect.github.com/swc-project/swc/commit/ad0e3b49bca3a61bc8f5ac90e15dc263b9cc674c))

- **(es/optimization)** Preserve JSON numeric values ([#&#8203;12051](https://redirect.github.com/swc-project/swc/issues/12051)) ([667af8c](https://redirect.github.com/swc-project/swc/commit/667af8cacdbc58e1af3887d381184355b84d4952))

- **(es/transforms)** Use numeric literals for non-finite enum values ([#&#8203;12049](https://redirect.github.com/swc-project/swc/issues/12049)) ([1e3ed5c](https://redirect.github.com/swc-project/swc/commit/1e3ed5caf878cfb867a374e768ae8e8344531441))

- **(es/typescript)** Evaluate cooked enum templates ([#&#8203;12059](https://redirect.github.com/swc-project/swc/issues/12059)) ([49d0b0f](https://redirect.github.com/swc-project/swc/commit/49d0b0f1ac744b04bb657a7e3147ed44ba7ecdde))

- **(html/minifier)** Preserve JSON script boundaries ([#&#8203;12080](https://redirect.github.com/swc-project/swc/issues/12080)) ([e1877b4](https://redirect.github.com/swc-project/swc/commit/e1877b44bdac8abc9fd51e984d584f40f6999832))

- **(testing)** Check ignored fixtures relative to crate root ([#&#8203;12073](https://redirect.github.com/swc-project/swc/issues/12073)) ([da858b4](https://redirect.github.com/swc-project/swc/commit/da858b45923c73238dc16a8a8e7ebf9e77048e71))

- **(ts/fast-strip)** Preserve ASI before interpolated templates ([#&#8203;12040](https://redirect.github.com/swc-project/swc/issues/12040)) ([54467fe](https://redirect.github.com/swc-project/swc/commit/54467fe851eb51c751916225b5372cdd2ccae900))

- **(ts/fast-strip)** Preserve UTF-16 source positions ([#&#8203;12067](https://redirect.github.com/swc-project/swc/issues/12067)) ([ac4bfc9](https://redirect.github.com/swc-project/swc/commit/ac4bfc95973e50997ba1a7131ccd4d9fe1ff8898))

##### Features

- **(es/minifier)** Expand support for trivial spreads ([#&#8203;12068](https://redirect.github.com/swc-project/swc/issues/12068)) ([aa49e36](https://redirect.github.com/swc-project/swc/commit/aa49e36b247ce11144e03b63e52a1f7792065db1))

- **(es/react-compiler)** Expose `reactCompiler.environment.enableFunctionOutlining` ([#&#8203;12030](https://redirect.github.com/swc-project/swc/issues/12030)) ([52b78aa](https://redirect.github.com/swc-project/swc/commit/52b78aa1d75b20f6bb1cddef96c9d79ab1ca5e53))

##### Performance

- **(es/renamer)** Skip identity rename mappings on apply ([#&#8203;12041](https://redirect.github.com/swc-project/swc/issues/12041)) ([0f9ff15](https://redirect.github.com/swc-project/swc/commit/0f9ff15f8172c4cddba8037fb9410c359830319e))

### [`v1.15.46`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11546---2026-07-19)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.43...v1.15.46)

##### Bug Fixes

- **(deps)** Update crossbeam-epoch to 0.9.20 ([#&#8203;12004](https://redirect.github.com/swc-project/swc/issues/12004)) ([fababa1](https://redirect.github.com/swc-project/swc/commit/fababa16c16c55619164a4d9818d161072ce145f))

- **(es/fixer)** Normalize for-head ident patterns ([#&#8203;11968](https://redirect.github.com/swc-project/swc/issues/11968)) ([af681bc](https://redirect.github.com/swc-project/swc/commit/af681bc4471139c60bb5e0f2df2069b9d8be7aca))

- **(es/fixer)** Preserve parens around PURE-annotated receivers ([#&#8203;12022](https://redirect.github.com/swc-project/swc/issues/12022)) ([73d8941](https://redirect.github.com/swc-project/swc/commit/73d894103b4b9302ebb8a8c71a6ec19cab375d89))

- **(es/hygiene)** Ignore eval in default hygiene pass ([#&#8203;12003](https://redirect.github.com/swc-project/swc/issues/12003)) ([dd43ad6](https://redirect.github.com/swc-project/swc/commit/dd43ad61e802a2b7bff30896d4869f7ace49a129))

- **(es/minifier)** Eliminate unused classes with cyclic references ([#&#8203;11963](https://redirect.github.com/swc-project/swc/issues/11963)) ([63a94b9](https://redirect.github.com/swc-project/swc/commit/63a94b92c2ef96d64413f0e29af7dbc3594ead5a))

- **(es/minifier)** Preserve switch fallthrough termination ([#&#8203;11971](https://redirect.github.com/swc-project/swc/issues/11971)) ([a5d19ae](https://redirect.github.com/swc-project/swc/commit/a5d19ae89ea8cc1aa80df39fe46e207130e12934))

- **(es/minifier)** Check last case ([#&#8203;11972](https://redirect.github.com/swc-project/swc/issues/11972)) ([060c7ac](https://redirect.github.com/swc-project/swc/commit/060c7ac2e6795ed4c28562417167cecac3d0c5d1))

- **(es/minifier)** Disable IIFE invoke when there's eval ([#&#8203;11984](https://redirect.github.com/swc-project/swc/issues/11984)) ([eabe4be](https://redirect.github.com/swc-project/swc/commit/eabe4be047916d437365aad256ec0932c0f50c16))

- **(es/minifier)** Invoke IIFE when has eval ([#&#8203;11987](https://redirect.github.com/swc-project/swc/issues/11987)) ([457df11](https://redirect.github.com/swc-project/swc/commit/457df113722f972cd26e42c84fa94ff22290c94f))

- **(es/minifier)** Make Infect Collect collect every used ident ([#&#8203;11998](https://redirect.github.com/swc-project/swc/issues/11998)) ([fb9ebee](https://redirect.github.com/swc-project/swc/commit/fb9ebeebc33bed96a53e44b7a84035f93d9d1ab9))

- **(es/minifier)** Measure number length precisely ([#&#8203;12026](https://redirect.github.com/swc-project/swc/issues/12026)) ([54d139a](https://redirect.github.com/swc-project/swc/commit/54d139a23a8e541859a0107b269db96ba730c7a5))

- **(es/module)** Rewrite `.tsx` imports to `.js` unless JSX is preserved ([#&#8203;11995](https://redirect.github.com/swc-project/swc/issues/11995)) ([c341d9c](https://redirect.github.com/swc-project/swc/commit/c341d9c6e13bd4f71f8c5aeffc4d84ac4f82c28f))

- **(es/module)** Rewrite SystemJS transform ([#&#8203;11996](https://redirect.github.com/swc-project/swc/issues/11996)) ([2f47530](https://redirect.github.com/swc-project/swc/commit/2f475305944477f19484117226ce4d9c864fbf5e))

- **(es/modules)** Resolve relative symlinked inputs from cwd ([#&#8203;11883](https://redirect.github.com/swc-project/swc/issues/11883)) ([01e857d](https://redirect.github.com/swc-project/swc/commit/01e857d7e2848181df9f75bf3fd968a2d44309ad))

- **(es/react)** Emit jsxdev source for fragments ([#&#8203;11993](https://redirect.github.com/swc-project/swc/issues/11993)) ([a70ce24](https://redirect.github.com/swc-project/swc/commit/a70ce24ac453e299fb05d87f5f9e2c05b14a580b))

- **(es/react-compiler)** Correct catch and parameter scope resolution ([#&#8203;11985](https://redirect.github.com/swc-project/swc/issues/11985)) ([3867e57](https://redirect.github.com/swc-project/swc/commit/3867e57e8ed55b41f63bbe9c9827a0a12bfdc2a1))

- **(react-compiler)** Remove React-like prefilter ([#&#8203;12007](https://redirect.github.com/swc-project/swc/issues/12007)) ([ab66869](https://redirect.github.com/swc-project/swc/commit/ab6686969decd940808bdeaea55e83953d4c6610))

- **(ts/fast-strip)** Handle generic arrow line breaks ([#&#8203;12034](https://redirect.github.com/swc-project/swc/issues/12034)) ([3d82701](https://redirect.github.com/swc-project/swc/commit/3d8270109a97d991a07b6642fe595c7b576ecbc9))

##### Documentation

- **(agents)** Document minifier assumptions ([#&#8203;11966](https://redirect.github.com/swc-project/swc/issues/11966)) ([58df612](https://redirect.github.com/swc-project/swc/commit/58df612bf65b2e89f85120fad0c537f3bb3834a8))

##### Features

- **(bindings)** Add `lint` / `lintSync` API to `@swc/react-compiler` ([#&#8203;11965](https://redirect.github.com/swc-project/swc/issues/11965)) ([ab4ce67](https://redirect.github.com/swc-project/swc/commit/ab4ce67b6339584531801583030b8f4fc3874c6e))

- **(es/minifier)** Remove unused param for new Function or Class Expr ([#&#8203;12017](https://redirect.github.com/swc-project/swc/issues/12017)) ([be56e09](https://redirect.github.com/swc-project/swc/commit/be56e09901846d01126ab6150e15aec574bc03f0))

- **(es/minifier)** Remove unused param for new expr ([#&#8203;12027](https://redirect.github.com/swc-project/swc/issues/12027)) ([661067c](https://redirect.github.com/swc-project/swc/commit/661067cfe92d5108f9ee5f32a24f3cbf30fc6c56))

- **(wasm)** Add [@&#8203;swc/nodejs-support-wasm](https://redirect.github.com/swc/nodejs-support-wasm) ([#&#8203;11975](https://redirect.github.com/swc-project/swc/issues/11975)) ([b617562](https://redirect.github.com/swc-project/swc/commit/b617562734d0819946ebba8d95ccdec8fe8de3b0))

##### Refactor

- **(es/helpers)** Generate inline helpers from canonical ESM sources ([#&#8203;12006](https://redirect.github.com/swc-project/swc/issues/12006)) ([f36e4b6](https://redirect.github.com/swc-project/swc/commit/f36e4b6d66caaad66d9e99659c0d7b5ec613e74a))

- **(es/helpers)** Remove unused jsx helper ([#&#8203;12009](https://redirect.github.com/swc-project/swc/issues/12009)) ([ccbc906](https://redirect.github.com/swc-project/swc/commit/ccbc906f31f36c56bee8e4ff0ac896c656598065))

- **(es/lexer)** Remove smartstring dependency ([#&#8203;12013](https://redirect.github.com/swc-project/swc/issues/12013)) ([d6833cc](https://redirect.github.com/swc-project/swc/commit/d6833cc8d7fb2714411e1795e525c4e0a3cc8225))

- **(es/minifier)** Remove ProgramData.top ([#&#8203;12031](https://redirect.github.com/swc-project/swc/issues/12031)) ([a72571f](https://redirect.github.com/swc-project/swc/commit/a72571f7ed086f39cb174329dec1eabb0152e36f))

- **(es/module)** Align module transform records with spec terms ([#&#8203;11992](https://redirect.github.com/swc-project/swc/issues/11992)) ([f680df5](https://redirect.github.com/swc-project/swc/commit/f680df59d482de708669eb8d720dac97bd412cf3))

- **(es/module)** Introduce source module lowering pipeline ([#&#8203;11999](https://redirect.github.com/swc-project/swc/issues/11999)) ([9609b7f](https://redirect.github.com/swc-project/swc/commit/9609b7fd1d6a28fc359615f9e6e876f82923c898))

- Remove direct rkyv dependencies ([#&#8203;12010](https://redirect.github.com/swc-project/swc/issues/12010)) ([5761a2b](https://redirect.github.com/swc-project/swc/commit/5761a2b162c9ae41bd436932619d773ceb042d41))

##### Testing

- **(react-compiler)** Add build-pass fixtures for wrapped assignment targets ([#&#8203;11967](https://redirect.github.com/swc-project/swc/issues/11967)) ([58d9b53](https://redirect.github.com/swc-project/swc/commit/58d9b537b04c2c0e158280b9b2cef463415ca6a2))

##### Build

- Remove vergen dependency ([#&#8203;11976](https://redirect.github.com/swc-project/swc/issues/11976)) ([26d8a28](https://redirect.github.com/swc-project/swc/commit/26d8a28bd14e46b2eed6459de0309aa07a12bd86))

##### Ci

- Allow publish milestone PR updates ([#&#8203;11960](https://redirect.github.com/swc-project/swc/issues/11960)) ([885d3e2](https://redirect.github.com/swc-project/swc/commit/885d3e22796b6c1f6512d827fdb77c31a9df706e))

- Allow memmap2 advisory ([#&#8203;11961](https://redirect.github.com/swc-project/swc/issues/11961)) ([0be5872](https://redirect.github.com/swc-project/swc/commit/0be5872e6af5539f3ced5aa1c4ffbe3bffd505f8))

- Update rust-toolchain action pin ([#&#8203;12021](https://redirect.github.com/swc-project/swc/issues/12021)) ([78b41b5](https://redirect.github.com/swc-project/swc/commit/78b41b59c89c50fca16edaf80d1400beb7c1a801))

- Use Node.js 24 by default ([#&#8203;12035](https://redirect.github.com/swc-project/swc/issues/12035)) ([d658d08](https://redirect.github.com/swc-project/swc/commit/d658d08d4674961f69c3270d22722f416c1d5008))

- Update rust-toolchain action pin ([#&#8203;12036](https://redirect.github.com/swc-project/swc/issues/12036)) ([d1a1e23](https://redirect.github.com/swc-project/swc/commit/d1a1e23756a156e5c99113dc528d3c09684c39cd))

- Use Node.js 24 for wasm publishing ([#&#8203;12038](https://redirect.github.com/swc-project/swc/issues/12038)) ([516bf3c](https://redirect.github.com/swc-project/swc/commit/516bf3c7a2a0366c1f378a515053ee7df6918f8c))

### [`v1.15.43`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11543---2026-06-22)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.41...v1.15.43)

##### Bug Fixes

- **(es/es2022)** Correct scope for private property brand checks ([#&#8203;11953](https://redirect.github.com/swc-project/swc/issues/11953)) ([fb5afa2](https://redirect.github.com/swc-project/swc/commit/fb5afa22796439b41a0b261b6a4823cab0dcc8df))

- **(es/minifier)** Preserve `cooked` when concatenating template literals ([#&#8203;11939](https://redirect.github.com/swc-project/swc/issues/11939)) ([a7244a6](https://redirect.github.com/swc-project/swc/commit/a7244a65e2dcb28f20ab6d747fd782d02a8eebf9))

- **(es/minifier)** Gate Number(x) -> +x on unsafe flag ([#&#8203;11944](https://redirect.github.com/swc-project/swc/issues/11944)) ([#&#8203;11949](https://redirect.github.com/swc-project/swc/issues/11949)) ([6176019](https://redirect.github.com/swc-project/swc/commit/617601978a4090cde8c0dd900c079cc7eb64b642))

- **(es/parser)** Parse Flow bare renders types ([#&#8203;11929](https://redirect.github.com/swc-project/swc/issues/11929)) ([a71c8eb](https://redirect.github.com/swc-project/swc/commit/a71c8eba7b0ef4280b8866cd8e6eebc5be10f0dc))

- **(es/parser)** Allow no-default builds ([#&#8203;11956](https://redirect.github.com/swc-project/swc/issues/11956)) ([baab240](https://redirect.github.com/swc-project/swc/commit/baab240500b8d7329fabfb3ec936ba62b59742db))

- **(es/react-compiler)** Skip TypeScript `this` pseudo-params in scope collector ([#&#8203;11940](https://redirect.github.com/swc-project/swc/issues/11940)) ([9066c43](https://redirect.github.com/swc-project/swc/commit/9066c4319a8c4e8bf9dc97885d2d7ff3a26cf79f))

- **(es/react-compiler)** Scope ClassStaticBlock and TsModuleBlock as var boundaries ([#&#8203;11943](https://redirect.github.com/swc-project/swc/issues/11943)) ([1ee74a0](https://redirect.github.com/swc-project/swc/commit/1ee74a0cc5938a720e106221374c0d894396a16d))

- **(react-compiler)** Avoid reporting non-fatal success errors as diagnostics ([#&#8203;11951](https://redirect.github.com/swc-project/swc/issues/11951)) ([cb4cb23](https://redirect.github.com/swc-project/swc/commit/cb4cb230ec473cb42ccd27dc8d20702ccb24e653))

- **(react-compiler)** React compiler AST conversion for wrapped assignment targets ([#&#8203;11952](https://redirect.github.com/swc-project/swc/issues/11952)) ([fc9b453](https://redirect.github.com/swc-project/swc/commit/fc9b4537a0e4adf8bce0f8834b7805a75a448a5b))

- **(react-compiler)** Disable parser default features ([#&#8203;11957](https://redirect.github.com/swc-project/swc/issues/11957)) ([75ddb28](https://redirect.github.com/swc-project/swc/commit/75ddb28bceb2c88ea5f0aaa21e19d4f83f4ae5c7))

##### Documentation

- Document untrusted input security scope ([#&#8203;11937](https://redirect.github.com/swc-project/swc/issues/11937)) ([677305b](https://redirect.github.com/swc-project/swc/commit/677305b6fb204d5ffd391616f3e091c5c190893a))

##### Features

- **(es/react-compiler)** Add React Compiler ([#&#8203;11917](https://redirect.github.com/swc-project/swc/issues/11917)) ([b182fbd](https://redirect.github.com/swc-project/swc/commit/b182fbd5bc0336f33ac1dec4ca0027d5b25ce1e3))

- **(swc)** Gate react compiler re-export ([#&#8203;11941](https://redirect.github.com/swc-project/swc/issues/11941)) ([dcc0f2d](https://redirect.github.com/swc-project/swc/commit/dcc0f2d0c5c5b68656065277b0b84572286693a5))

##### Miscellaneous Tasks

- **(es/react-compiler)** Update forked react compiler to 0.2.0 ([#&#8203;11946](https://redirect.github.com/swc-project/swc/issues/11946)) ([6fbe188](https://redirect.github.com/swc-project/swc/commit/6fbe188741cebee363e7afeec4b0c4aa96144070))

##### Refactor

- **(es/react-compiler)** Preserve TS metadata during AST roundtrip ([#&#8203;11950](https://redirect.github.com/swc-project/swc/issues/11950)) ([9c4dec3](https://redirect.github.com/swc-project/swc/commit/9c4dec3799bc65782823281ba9b2bb714c43181c))

- Remove production tracing hooks ([#&#8203;11945](https://redirect.github.com/swc-project/swc/issues/11945)) ([0dffdc4](https://redirect.github.com/swc-project/swc/commit/0dffdc4998a5b8605de8f07fb0518bc60495a931))

### [`v1.15.41`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11541---2026-06-09)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.40...v1.15.41)

##### Bug Fixes

- **(bindings/node)** Preserve source context for AST transforms ([#&#8203;11920](https://redirect.github.com/swc-project/swc/issues/11920)) ([b6dfa74](https://redirect.github.com/swc-project/swc/commit/b6dfa74d9e518904f93a39ad05ab2e17e3229d2d))

- **(es/codegen)** Emit `export as namespace` correctly ([#&#8203;11923](https://redirect.github.com/swc-project/swc/issues/11923)) ([4e1f832](https://redirect.github.com/swc-project/swc/commit/4e1f8326295932d77faa3d617a5b7cb8ba993a38))

- **(es/codegen)** Emit `export as namespace` minified correctly ([#&#8203;11924](https://redirect.github.com/swc-project/swc/issues/11924)) ([7157499](https://redirect.github.com/swc-project/swc/commit/71574992dde5c4ef5de6a564ea096d48d739b6e2))

- **(es/compat)** Rewrite this in destructuring defaults ([#&#8203;11909](https://redirect.github.com/swc-project/swc/issues/11909)) ([68af779](https://redirect.github.com/swc-project/swc/commit/68af779eff35120407a7147b3b60700c54db243c))

- **(es/decorators)** Delay 2022 decorator initializers after private fields ([#&#8203;11847](https://redirect.github.com/swc-project/swc/issues/11847)) ([3f1a4f5](https://redirect.github.com/swc-project/swc/commit/3f1a4f59670f58533d6f7545b671704d0ef469de))

- **(es/decorators)** Handle import types in decorator metadata ([#&#8203;11916](https://redirect.github.com/swc-project/swc/issues/11916)) ([f411429](https://redirect.github.com/swc-project/swc/commit/f4114297983e1f62220f57caaa4e2138ab906f5d))

- **(es/fixer)** Preserve new tagged template callee parens ([#&#8203;11922](https://redirect.github.com/swc-project/swc/issues/11922)) ([242a03a](https://redirect.github.com/swc-project/swc/commit/242a03a5fcd6542eab527dfdcb67590b0b477eba))

- **(es/minifier)** Handle unknown member props ([#&#8203;11927](https://redirect.github.com/swc-project/swc/issues/11927)) ([e59ba68](https://redirect.github.com/swc-project/swc/commit/e59ba6890764a2f121c38df1a71d5f70e179b08d))

- **(es/parser)** Handle Flow async generic arrows ([#&#8203;11926](https://redirect.github.com/swc-project/swc/issues/11926)) ([b9b8993](https://redirect.github.com/swc-project/swc/commit/b9b8993391168e6b83e9f84b3c4c063cf4ccd4f7))

- **(es/renamer)** Avoid duplicate mangled names across eval scope boundaries ([#&#8203;11913](https://redirect.github.com/swc-project/swc/issues/11913)) ([4a1af84](https://redirect.github.com/swc-project/swc/commit/4a1af846d2cc0039b3a0d6e997f8c1c131e22a2b))

- **(plugin)** Avoid importing \_\_free from env ([#&#8203;11908](https://redirect.github.com/swc-project/swc/issues/11908)) ([4584296](https://redirect.github.com/swc-project/swc/commit/4584296629bd87f7186a09b0ec37d5ab3dd3ff94))

- **(swc)** Preserve plugin error context ([#&#8203;11904](https://redirect.github.com/swc-project/swc/issues/11904)) ([4e2e9fc](https://redirect.github.com/swc-project/swc/commit/4e2e9fc3900475085e3f426e59e81d3a51fa34fa))

- **(swc\_common)** Fix sourcemap panic for multibyte mapping positions ([#&#8203;11918](https://redirect.github.com/swc-project/swc/issues/11918)) ([40c1601](https://redirect.github.com/swc-project/swc/commit/40c16011bc5487732483164886d8031f3f03cf79))

##### Documentation

- Fix architecture fixer link ([#&#8203;11911](https://redirect.github.com/swc-project/swc/issues/11911)) ([51cbc8c](https://redirect.github.com/swc-project/swc/commit/51cbc8c8d24021c59895c7787aa800d4a5fb4110))

##### Performance

- Lazily compute source file hashes ([#&#8203;11879](https://redirect.github.com/swc-project/swc/issues/11879)) ([a3cfbd7](https://redirect.github.com/swc-project/swc/commit/a3cfbd7be01b11aada1f31f4217c7bcde7666bd2))

- Optimize Atom equality ([#&#8203;11902](https://redirect.github.com/swc-project/swc/issues/11902)) ([c6f8cb0](https://redirect.github.com/swc-project/swc/commit/c6f8cb087678bcaeb4ab7802a6f6805ef6ddd82c))

##### Revert

- **(es/decorators)** Revert decorator initializer ordering ([#&#8203;11901](https://redirect.github.com/swc-project/swc/issues/11901)) ([a3f23b1](https://redirect.github.com/swc-project/swc/commit/a3f23b10986654bcc7296283786d90934a39a53b))

- **(swc\_common)** Revert sourcemap multibyte mapping clamp ([#&#8203;11919](https://redirect.github.com/swc-project/swc/issues/11919)) ([08b4200](https://redirect.github.com/swc-project/swc/commit/08b420000bce30b0d96d480201c852b2639fc680))

### [`v1.15.40`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11540---2026-05-23)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.33...v1.15.40)

##### Bug Fixes

- **(es/minifier)** Preserve args for destructured callbacks ([#&#8203;11830](https://redirect.github.com/swc-project/swc/issues/11830)) ([21873b0](https://redirect.github.com/swc-project/swc/commit/21873b06df3fd62d952a21cf879e14d11d4b39d7))

- **(es/minifier)** Avoid generating mangled property names that collide with existing properties ([#&#8203;11839](https://redirect.github.com/swc-project/swc/issues/11839)) ([9b4fab5](https://redirect.github.com/swc-project/swc/commit/9b4fab58c90256a6da688de87ea405225a5a6fdb))

- **(es/minifier)** Respect ecma for iife temp vars ([#&#8203;11873](https://redirect.github.com/swc-project/swc/issues/11873)) ([e481934](https://redirect.github.com/swc-project/swc/commit/e481934a63c0ee891e4a770c4f0cd5ec3fd8624e))

- **(es/minifier)** Preserve default parameter object props ([#&#8203;11884](https://redirect.github.com/swc-project/swc/issues/11884)) ([71ff84f](https://redirect.github.com/swc-project/swc/commit/71ff84f19762306ab9b86accb29eb6ed83c46f84))

- **(es/parser)** Reject object-rest assignment to array/object literal ([#&#8203;11875](https://redirect.github.com/swc-project/swc/issues/11875)) ([7b57d1f](https://redirect.github.com/swc-project/swc/commit/7b57d1f8717d8bf6be0b617b04bc6e219a2b3775))

- **(es/parser)** Reject object rest assignment to literals ([#&#8203;11881](https://redirect.github.com/swc-project/swc/issues/11881)) ([4ec2eaf](https://redirect.github.com/swc-project/swc/commit/4ec2eaf4d89ddd95293b8f09169a88b0434c5a13))

- **(es/react)** Exclude self-recursive hooks from refresh dependency array ([#&#8203;11838](https://redirect.github.com/swc-project/swc/issues/11838)) ([9101c71](https://redirect.github.com/swc-project/swc/commit/9101c719fa8f3f5cb410d716d4f50544650cd81e))

- **(ts/fast-dts)** Strip definite assertions in dts ([#&#8203;11858](https://redirect.github.com/swc-project/swc/issues/11858)) ([2ab1b8a](https://redirect.github.com/swc-project/swc/commit/2ab1b8a50f2af3d8b4c42d6c4dd4f2051940cae0))

- **(ts/fast-strip)** Reject unsafe assertion erasure in binary expressions ([#&#8203;11828](https://redirect.github.com/swc-project/swc/issues/11828)) ([aa5b539](https://redirect.github.com/swc-project/swc/commit/aa5b539b277dbf4c68c87380d16f4b8713145df3))

- **(typescript)** Strip parameter binding defaults in dts ([#&#8203;11857](https://redirect.github.com/swc-project/swc/issues/11857)) ([800bc17](https://redirect.github.com/swc-project/swc/commit/800bc170334a74191eb5ae21e3bfc96bf6f7fe56))

##### Documentation

- Update agent guidance ([#&#8203;11842](https://redirect.github.com/swc-project/swc/issues/11842)) ([bf2d015](https://redirect.github.com/swc-project/swc/commit/bf2d0154cf8b66fdab16085585fda0086d297a64))

- Add security policy ([#&#8203;11876](https://redirect.github.com/swc-project/swc/issues/11876)) ([6c43c2d](https://redirect.github.com/swc-project/swc/commit/6c43c2de9cb9d5516b0ac87101345940964e943e))

- Clarify security scope for npm packages ([#&#8203;11877](https://redirect.github.com/swc-project/swc/issues/11877)) ([4662db8](https://redirect.github.com/swc-project/swc/commit/4662db8fe3e503f298a285697ea63ecc1ca3b958))

- Clarify untrusted input security model ([#&#8203;11882](https://redirect.github.com/swc-project/swc/issues/11882)) ([5463777](https://redirect.github.com/swc-project/swc/commit/546377770e164aead174404fb678319c9c56a9dc))

##### Features

- **(es/minifier)** Fine grained effect analysis of class ([#&#8203;11814](https://redirect.github.com/swc-project/swc/issues/11814)) ([c9058ad](https://redirect.github.com/swc-project/swc/commit/c9058adb5bb7d6bbe354e6136685271f722354a0))

- **(swc\_cli)** Implement all features for `swc_cli` ([#&#8203;11797](https://redirect.github.com/swc-project/swc/issues/11797)) ([9300ede](https://redirect.github.com/swc-project/swc/commit/9300ede1d495463042da1db11754c76057a50954))

##### Miscellaneous Tasks

- **(es/minifier)** Fix typo in debug log ([#&#8203;11866](https://redirect.github.com/swc-project/swc/issues/11866)) ([3de0254](https://redirect.github.com/swc-project/swc/commit/3de0254db7fae5a2883af78b8b7d57af4cb94531))

- **(html)** Add webcontainer fallback for `@swc/html` ([#&#8203;11860](https://redirect.github.com/swc-project/swc/issues/11860)) ([7692eed](https://redirect.github.com/swc-project/swc/commit/7692eed981916bb01a3c4c231b3af012d4993d9e))

##### Performance

- **(ecma)** Reduce transformer compat overhead ([#&#8203;11856](https://redirect.github.com/swc-project/swc/issues/11856)) ([d03cb71](https://redirect.github.com/swc-project/swc/commit/d03cb71fb8b39f01f0ad704473109294e52e07fd))

- **(es/codegen)** Speed up JsWriter position and srcmap tracking ([#&#8203;11867](https://redirect.github.com/swc-project/swc/issues/11867)) ([dbceade](https://redirect.github.com/swc-project/swc/commit/dbceade22809ac9a9cb7548456ab335df26fb046))

- **(es/codegen)** Remove JsWriter last\_srcmap cache ([#&#8203;11869](https://redirect.github.com/swc-project/swc/issues/11869)) ([3bc1c2b](https://redirect.github.com/swc-project/swc/commit/3bc1c2b9b2594b05478dc4240977b981d6f8521b))

- **(es/minifier)** Reduce minifier profiling hotspots ([#&#8203;11853](https://redirect.github.com/swc-project/swc/issues/11853)) ([28c1091](https://redirect.github.com/swc-project/swc/commit/28c1091adb2c6f6d0e46daa5595908d1ba6fccb7))

- Optimize es parser comment finalization ([#&#8203;11852](https://redirect.github.com/swc-project/swc/issues/11852)) ([2959ddf](https://redirect.github.com/swc-project/swc/commit/2959ddf87af0ac95eb5176180782819bd1073d66))

##### Testing

- **(es/minifier)** Move issue\_11835 fixture out of terser folder ([#&#8203;11840](https://redirect.github.com/swc-project/swc/issues/11840)) ([3dd3431](https://redirect.github.com/swc-project/swc/commit/3dd34310d429baff6e8d1a6393266c648684d3c6))

##### Ci

- Update corepack in publish docker jobs ([#&#8203;11885](https://redirect.github.com/swc-project/swc/issues/11885)) ([9a7d954](https://redirect.github.com/swc-project/swc/commit/9a7d954c4939b12da4c60023eba50d6df8086fd7))

- Pass publish docker env explicitly ([#&#8203;11888](https://redirect.github.com/swc-project/swc/issues/11888)) ([c5f7547](https://redirect.github.com/swc-project/swc/commit/c5f7547cf68a4803aec3e88901e0d6b57ebbeb55))

- Lock issues closed by merged prs ([#&#8203;11887](https://redirect.github.com/swc-project/swc/issues/11887)) ([6bd74e5](https://redirect.github.com/swc-project/swc/commit/6bd74e5683ed43640db64f78dc74001a056c1bfa))

- Provide aarch64 musl linker in publish job ([#&#8203;11889](https://redirect.github.com/swc-project/swc/issues/11889)) ([20234fd](https://redirect.github.com/swc-project/swc/commit/20234fd265f8f86f0c81c31c36e467d405a04d01))

- Fix publish musl linker and windows tests ([#&#8203;11890](https://redirect.github.com/swc-project/swc/issues/11890)) ([a798a23](https://redirect.github.com/swc-project/swc/commit/a798a23e5f5018e5c01f874457aa20370c0d7058))

- Make minifier test path explicit ([#&#8203;11891](https://redirect.github.com/swc-project/swc/issues/11891)) ([e7cba97](https://redirect.github.com/swc-project/swc/commit/e7cba972ff25565208c4448accab19c259e6947c))

##### Security

- Save CI caches only on main ([#&#8203;11848](https://redirect.github.com/swc-project/swc/issues/11848)) ([7582529](https://redirect.github.com/swc-project/swc/commit/75825293150b548216bf5c08531e1850bd064fcb))

- Update rkyv and Rust dependencies ([#&#8203;11851](https://redirect.github.com/swc-project/swc/issues/11851)) ([20d92eb](https://redirect.github.com/swc-project/swc/commit/20d92eb3c8dee378f046a6bff839913600a1fbdb))

- Harden PR workflow permissions ([#&#8203;11849](https://redirect.github.com/swc-project/swc/issues/11849)) ([e199564](https://redirect.github.com/swc-project/swc/commit/e199564ebaae88ec121a777cf0ec4eec9644aed5))

### [`v1.15.33`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11533---2026-05-02)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.32...v1.15.33)

##### Bug Fixes

- **(ci)** Update rand lockfile entries ([#&#8203;11827](https://redirect.github.com/swc-project/swc/issues/11827)) ([7988966](https://redirect.github.com/swc-project/swc/commit/7988966eb33d2404fe588ec50345100ea57a3cf4))

- **(es/minifier)** Fold unary bool nullish coalescing ([#&#8203;11826](https://redirect.github.com/swc-project/swc/issues/11826)) ([e39ae3d](https://redirect.github.com/swc-project/swc/commit/e39ae3d3489373414ef23177b82f0ab77250a1f2))

- **(es/minifier)** Preserve for-init sequence order ([#&#8203;11837](https://redirect.github.com/swc-project/swc/issues/11837)) ([16a56d0](https://redirect.github.com/swc-project/swc/commit/16a56d031fd801796df6b648bc533b97e27b39f8))

- **(es/parser)** Parse empty Flow exact object type ([#&#8203;11836](https://redirect.github.com/swc-project/swc/issues/11836)) ([3d18a26](https://redirect.github.com/swc-project/swc/commit/3d18a2673a69e6e6172c161815fd576c41d59330))

##### Features

- Move swc ast explorer into workspace ([#&#8203;11831](https://redirect.github.com/swc-project/swc/issues/11831)) ([02a8f81](https://redirect.github.com/swc-project/swc/commit/02a8f8123bdec3e8291a2f82ccf01d3e44114c49))

### [`v1.15.32`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11532---2026-04-27)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.30...v1.15.32)

##### Bug Fixes

- **(es/flow)** Fix Flow type-only modules in script transforms ([#&#8203;11817](https://redirect.github.com/swc-project/swc/issues/11817)) ([be38316](https://redirect.github.com/swc-project/swc/commit/be38316f9a7242f2d3765503216b9c3116021b1c))

- **(es/flow)** Avoid restoring module context when flow syntax is enabled ([#&#8203;11819](https://redirect.github.com/swc-project/swc/issues/11819)) ([3ed7243](https://redirect.github.com/swc-project/swc/commit/3ed724389a55847f5e236421c23f2cd85a7208b3))

- **(es/minifier)** Preserve frozen spread registry keys ([#&#8203;11825](https://redirect.github.com/swc-project/swc/issues/11825)) ([347181c](https://redirect.github.com/swc-project/swc/commit/347181c45717431a64cb60e0d6ccbe667322a809))

- **(es/parser)** Align Flow generic arrow JSX disambiguation ([#&#8203;11821](https://redirect.github.com/swc-project/swc/issues/11821)) ([28a7fad](https://redirect.github.com/swc-project/swc/commit/28a7fadc2acf95500d934988617b73f0debf5a53))

##### Features

- **(es)** Add `jsc.preserveSymlinks` to `swc::Options` ([#&#8203;11813](https://redirect.github.com/swc-project/swc/issues/11813)) ([fe38342](https://redirect.github.com/swc-project/swc/commit/fe38342b8fa960b430300f2491a5695c09debf4c))

### [`v1.15.30`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11530---2026-04-19)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.26...v1.15.30)

##### Bug Fixes

- **(deploy)** Fix musl binding test workflow ([#&#8203;11804](https://redirect.github.com/swc-project/swc/issues/11804)) ([c30a522](https://redirect.github.com/swc-project/swc/commit/c30a5226920311a26f2b9692d057a50b18266d30))

- **(deploy)** Build package ts before Linux GNU binding tests ([#&#8203;11806](https://redirect.github.com/swc-project/swc/issues/11806)) ([a3d3ef3](https://redirect.github.com/swc-project/swc/commit/a3d3ef3924a80e19101a9735bf357ac14cd68fbc))

- **(es/jsx)** Preserve quoted JSX attribute newlines ([#&#8203;11796](https://redirect.github.com/swc-project/swc/issues/11796)) ([9fe56c8](https://redirect.github.com/swc-project/swc/commit/9fe56c88553bb79254a7a5e991bfedc5f6c689e1))

- **(es/minifier)** Support full ES version parsing in minify ([#&#8203;11800](https://redirect.github.com/swc-project/swc/issues/11800)) ([af1f08f](https://redirect.github.com/swc-project/swc/commit/af1f08f09e749392815f0449ffac2bdd62a5b0e3))

- **(es/module)** Add opt-in symlink-preserving resolver ([#&#8203;11801](https://redirect.github.com/swc-project/swc/issues/11801)) ([6028240](https://redirect.github.com/swc-project/swc/commit/6028240017608aac8d80d2c1ff37cf9f13534af6))

- **(es/parser)** Allow return type annotation on Flow constructors ([#&#8203;11790](https://redirect.github.com/swc-project/swc/issues/11790)) ([d66b29c](https://redirect.github.com/swc-project/swc/commit/d66b29c11d7e9709906e7c6ba6a98fcde428ca65))

- **(es/parser)** Support Flow anonymous keyof indexers ([#&#8203;11792](https://redirect.github.com/swc-project/swc/issues/11792)) ([452c4e5](https://redirect.github.com/swc-project/swc/commit/452c4e59e6230e36ab2ef19608d214b72d3baf72))

- **(es/parser)** Add Flow strip RN and RNW regression corpus ([#&#8203;11799](https://redirect.github.com/swc-project/swc/issues/11799)) ([23a9109](https://redirect.github.com/swc-project/swc/commit/23a9109396dc1fcd496e2fbf90552fce0d5ca55b))

##### Documentation

- Require PR template for pull requests ([#&#8203;11793](https://redirect.github.com/swc-project/swc/issues/11793)) ([3a1084a](https://redirect.github.com/swc-project/swc/commit/3a1084ad1860afdbea2703f13030c3baaaf778db))

##### Features

- **(es/minify)** Support extracting comments ([#&#8203;11798](https://redirect.github.com/swc-project/swc/issues/11798)) ([5986411](https://redirect.github.com/swc-project/swc/commit/5986411655d7b9e3a1d4e401de9fbda94164c0a3))

### [`v1.15.26`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11526---2026-04-14)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.24...v1.15.26)

##### Bug Fixes

- **(es/decorators)** Preserve super in moved static members ([#&#8203;11781](https://redirect.github.com/swc-project/swc/issues/11781)) ([778328e](https://redirect.github.com/swc-project/swc/commit/778328e5b40232b311e33e0dede4f1f53e523c4a))

- **(es/decorators)** Scope moved static super rewrite ([#&#8203;11782](https://redirect.github.com/swc-project/swc/issues/11782)) ([f73cacc](https://redirect.github.com/swc-project/swc/commit/f73cacca16c628cf59820eddb6594fd08f124d6d))

- **(es/parser)** Parse mixed Flow anonymous callable params ([#&#8203;11786](https://redirect.github.com/swc-project/swc/issues/11786)) ([05e7b69](https://redirect.github.com/swc-project/swc/commit/05e7b69373d3b1e4957f557cb3d640b59998d8a7))

- **(es/transforms)** Rewrite class references in non-static members ([#&#8203;11772](https://redirect.github.com/swc-project/swc/issues/11772)) ([fff1426](https://redirect.github.com/swc-project/swc/commit/fff1426c86cd47d0d879c5e7c4f029c4adb132e7))

- **(es/typescript)** Handle TypeScript expressions in enum transformation ([#&#8203;11769](https://redirect.github.com/swc-project/swc/issues/11769)) ([85aa4a8](https://redirect.github.com/swc-project/swc/commit/85aa4a8b95f08d97df47d11f5c2fd11f7db97381))

##### Documentation

- Document Flow strip support ([#&#8203;11778](https://redirect.github.com/swc-project/swc/issues/11778)) ([8f176cc](https://redirect.github.com/swc-project/swc/commit/8f176cc907093bc80c6792744ea215b69ff62efb))

##### Features

- **(swc\_common)** Add SourceMapper.map\_raw\_pos ([#&#8203;11777](https://redirect.github.com/swc-project/swc/issues/11777)) ([7d2e94c](https://redirect.github.com/swc-project/swc/commit/7d2e94ce379ba8fc738a5697299cdb9a3c748e8a))

- **(swc\_config)** Add Hash/Eq for options and CachedRegex ([#&#8203;11775](https://redirect.github.com/swc-project/swc/issues/11775)) ([86a4c38](https://redirect.github.com/swc-project/swc/commit/86a4c383b8da40a53bad1b1b5098227d3087927c))

##### Performance

- **(swc)** Use larger input for es/full benchmarks ([#&#8203;11779](https://redirect.github.com/swc-project/swc/issues/11779)) ([4409920](https://redirect.github.com/swc-project/swc/commit/44099207878c2e7f6ec75379040402057ad4f97b))

##### Refactor

- **(es/minifier)** Inline into shorthand prop early ([#&#8203;11766](https://redirect.github.com/swc-project/swc/issues/11766)) ([450bdfa](https://redirect.github.com/swc-project/swc/commit/450bdfa14f61ca008f5399d7292d5d9bc5e07380))

##### Build

- Update `rustc` to `nightly-2026-04-10` ([#&#8203;11783](https://redirect.github.com/swc-project/swc/issues/11783)) ([6facc79](https://redirect.github.com/swc-project/swc/commit/6facc79dc4022e9a31dcb1c7e8952917f88867e9))

### [`v1.15.24`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11524---2026-04-04)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.21...v1.15.24)

##### Bug Fixes

- **(es/decorators)** Scope 2023-11 implicit-global rewrite to decorator-lifted exprs ([#&#8203;11743](https://redirect.github.com/swc-project/swc/issues/11743)) ([1c01bbb](https://redirect.github.com/swc-project/swc/commit/1c01bbb46ddb33b380b8216235c1e6f2767d0aae))

- **(es/minifier)** Handle `toExponential(undefined)` ([#&#8203;11583](https://redirect.github.com/swc-project/swc/issues/11583)) ([cd94a31](https://redirect.github.com/swc-project/swc/commit/cd94a3141621cec617dac7e84c50070cd598ec46))

- **(es/minifier)** Cap deep if\_return conditional chains ([#&#8203;11758](https://redirect.github.com/swc-project/swc/issues/11758)) ([a92fa3e](https://redirect.github.com/swc-project/swc/commit/a92fa3e8e27f604186a2393284d3deb67a9146f1))

- **(es/minifier)** Inline prop shorthand in computed props ([#&#8203;11760](https://redirect.github.com/swc-project/swc/issues/11760)) ([71feafb](https://redirect.github.com/swc-project/swc/commit/71feafb4bc79883a558164e9543ae4ecedc9187e))

- **(es/parser)** Parse key Flow forms from [#&#8203;11729](https://redirect.github.com/swc-project/swc/issues/11729) (phase 1) ([#&#8203;11733](https://redirect.github.com/swc-project/swc/issues/11733)) ([886fe53](https://redirect.github.com/swc-project/swc/commit/886fe533ad7edfb13804be3a779eccb160cf69e7))

- **(es/parser)** Close remaining Flow parser gaps for [#&#8203;11729](https://redirect.github.com/swc-project/swc/issues/11729) (phase 2) ([#&#8203;11740](https://redirect.github.com/swc-project/swc/issues/11740)) ([8d36f05](https://redirect.github.com/swc-project/swc/commit/8d36f05499f7e2cc5c568227d05e5f912e01509b))

- **(es/regexp)** Preserve source for wrapped named groups ([#&#8203;11757](https://redirect.github.com/swc-project/swc/issues/11757)) ([7e56fe5](https://redirect.github.com/swc-project/swc/commit/7e56fe5cb4dfc3fc1758e2139949107d5eaa8e47))

- **(html/codegen)** Keep </p> for span-parent paragraphs ([#&#8203;11756](https://redirect.github.com/swc-project/swc/issues/11756)) ([ede9950](https://redirect.github.com/swc-project/swc/commit/ede9950d35cdd4968331ac0111cdb413e60f3438))

- **(swc\_common)** Make `eat_byte` unsafe to prevent UTF-8 boundary violation ([#&#8203;11731](https://redirect.github.com/swc-project/swc/issues/11731)) ([669a659](https://redirect.github.com/swc-project/swc/commit/669a659c6e29c12eba793e646c6b29002782a84c))

##### Features

- **(es/minifier)** Remove useless arguments for non inlined callee ([#&#8

> ❗ **Important**
> 
> ✂ PR body was truncated to here.


</details>

---

#### chore(deps): update yarn to v4.18.0 ([#144](https://github.com/grafana/scenes-ml/pull/144))

<details>
<summary>yarnpkg/berry (yarn)</summary>

#### chore(deps): update dependency ts-jest to v29.4.12 ([#155](https://github.com/grafana/scenes-ml/pull/155))

<details>
<summary>kulshekhar/ts-jest (ts-jest)</summary>

### [`v29.4.12`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#29412-2026-07-22)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.11...v29.4.12)

##### Features

- **compiler:** support TypeScript 7 projects through compatibility aliases ([#&#8203;5386](https://redirect.github.com/kulshekhar/ts-jest/pull/5386))

### [`v29.4.11`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#29411-2026-05-21)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.10...v29.4.11)

##### Bug Fixes

- preserve Bundler on the CJS path under TypeScript >= 6 ([3941818](https://redirect.github.com/kulshekhar/ts-jest/commit/39418187515f11b6584d35a4e3ddf50231f74936)), closes [#&#8203;4198](https://redirect.github.com/kulshekhar/ts-jest/issues/4198)

### [`v29.4.10`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#29410-2026-05-18)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.9...v29.4.10)

##### Bug Fixes

- pass `resolutionMode` to `ts.resolveModuleName` for hybrid module support ([b557a85](https://redirect.github.com/kulshekhar/ts-jest/commit/b557a85f85c3fd34523ec3a15293afbdc9dea83c))
- rebuild `Program` when consecutive compiles need different module kinds ([a82a2b3](https://redirect.github.com/kulshekhar/ts-jest/commit/a82a2b32c4987a5249fd5284283117dd2fa3be47)), closes [#&#8203;4774](https://redirect.github.com/kulshekhar/ts-jest/issues/4774)
- respect tsconfig `moduleResolution` instead of forcing `Node10` ([1bffffc](https://redirect.github.com/kulshekhar/ts-jest/commit/1bffffc667557c173ae0c1f93dd436920775dac4))
- **transformer:** transpile `mjs` files from `node_modules` for CJS mode ([96d025d](https://redirect.github.com/kulshekhar/ts-jest/commit/96d025dd912ea2bceb18b67d2d509ada7a756d9d))
- **transformer:** use a consistent comparator in hoist-jest sortStatements ([8a8fd2f](https://redirect.github.com/kulshekhar/ts-jest/commit/8a8fd2fb8446655bba18367db9306a1089490e62))

### [`v29.4.9`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2949-2026-04-01)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.8...v29.4.9)

##### Bug Fixes

- use correct registry for npm OIDC trusted publishing ([f8a9cc9](https://redirect.github.com/kulshekhar/ts-jest/commit/f8a9cc9892))

### [`v29.4.8`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2948-2026-04-01)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.7...v29.4.8)

##### Bug Fixes

- wrong published assets

### [`v29.4.7`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2947-2026-04-01)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.6...v29.4.7)

##### Features

- support TypeScript v6 ([eda517d](https://redirect.github.com/kulshekhar/ts-jest/commit/eda517d226389317d99572887d3c1aa93c81be87))

</details>

---

#### chore(deps): update dependency @testing-library/user-event to v14.6.7 ([#156](https://github.com/grafana/scenes-ml/pull/156))

<details>
<summary>testing-library/user-event (@&#8203;testing-library/user-event)</summary>

#### chore(deps): update dependency lodash to v4.18.1 [security] ([#133](https://github.com/grafana/scenes-ml/pull/133))

<details>
<summary>lodash/lodash (lodash)</summary>

#### chore(deps): update dependency @grafana/tsconfig to v2 ([#121](https://github.com/grafana/scenes-ml/pull/121))

<details>
<summary>grafana/plugin-tools (@&#8203;grafana/tsconfig)</summary>

#### chore(deps): update dependency @rollup/plugin-node-resolve to v16 ([#122](https://github.com/grafana/scenes-ml/pull/122))

<details>
<summary>rollup/plugins (@&#8203;rollup/plugin-node-resolve)</summary>

### [`v16.0.3`](https://redirect.github.com/rollup/plugins/blob/HEAD/packages/node-resolve/CHANGELOG.md#v1603)

*2025-10-13*

##### Bugfixes

- fix: resolve bare targets of package "imports" using export maps; avoid fileURLToPath(null) ([#&#8203;1908](https://redirect.github.com/rollup/plugins/issues/1908))

### [`v16.0.2`](https://redirect.github.com/rollup/plugins/blob/HEAD/packages/node-resolve/CHANGELOG.md#v1602)

*2025-10-04*

##### Bugfixes

- fix: error thrown with empty entry ([#&#8203;1893](https://redirect.github.com/rollup/plugins/issues/1893))

### [`v16.0.1`](https://redirect.github.com/rollup/plugins/blob/HEAD/packages/node-resolve/CHANGELOG.md#v1601)

*2025-03-11*

##### Bugfixes

- fix: add `ignoreSideEffectsForRoot` to exported interface ([#&#8203;1841](https://redirect.github.com/rollup/plugins/issues/1841))

### [`v16.0.0`](https://redirect.github.com/rollup/plugins/blob/HEAD/packages/node-resolve/CHANGELOG.md#v1600)

*2024-12-15*

##### Breaking Changes

- feat!: set development or production condition ([#&#8203;1823](https://redirect.github.com/rollup/plugins/issues/1823))

</details>

---

#### fix(deps): update dependency @bsull/augurs to v0.10.2 ([#115](https://github.com/grafana/scenes-ml/pull/115))

<details>
<summary>grafana/augurs (@&#8203;bsull/augurs)</summary>

### [`v0.10.2`](https://redirect.github.com/grafana/augurs/blob/HEAD/CHANGELOG.md#augurs-seasons---0102---2026-02-24)

[Compare Source](https://redirect.github.com/grafana/augurs/compare/581e0364c1924180d743c937bff1122a8a6499be...6c527a795f98d7722ba3d4329793513e369c0e1f)

##### Other

- update Cargo.toml dependencies

### [`v0.10.1`](https://redirect.github.com/grafana/augurs/blob/HEAD/CHANGELOG.md#augurs-seasons---0101---2025-09-08)

[Compare Source](https://redirect.github.com/grafana/augurs/compare/5ee59f5570695f3bf3c08e38ed52dbeedcb3b3c1...581e0364c1924180d743c937bff1122a8a6499be)

##### Fixed

- fix clippy lints for Rust 1.88 ([#&#8203;315](https://redirect.github.com/grafana/augurs/pull/315))

### [`v0.10.0`](https://redirect.github.com/grafana/augurs/blob/HEAD/CHANGELOG.md#0100---2025-05-19)

[Compare Source](https://redirect.github.com/grafana/augurs/compare/1769039e7e50270bae6b0a25d2343d95d2153684...5ee59f5570695f3bf3c08e38ed52dbeedcb3b3c1)

##### `augurs-seasons`

No changes in this release.

##### `augurs-prophet`

- Add JS bindings for Prophet make\_future\_dataframe ([#&#8203;257](https://redirect.github.com/grafana/augurs/pull/257), by [@&#8203;shenxiangzhuang](https://redirect.github.com/shenxiangzhuang))
- *(deps)* bump zipfile to 3.x ([#&#8203;286](https://redirect.github.com/grafana/augurs/pull/286))
- *(deps)* update ureq requirement from 2.10.1 to 3.0.0 ([#&#8203;245](https://redirect.github.com/grafana/augurs/pull/245))
- *(deps)* bump wasmtime and wasmtime-wasi to 32 ([#&#8203;289](https://redirect.github.com/grafana/augurs/pull/289))

##### `augurs-outlier`

##### Added

- add setters for parameters ([#&#8203;253](https://redirect.github.com/grafana/augurs/pull/253), by [@&#8203;shenxiangzhuang](https://redirect.github.com/shenxiangzhuang))

##### `augurs-ets`

No changes in this release.

##### `augurs-mstl`

No changes in this release.

##### `augurs-dtw`

No changes in this release.

##### `augurs-clustering`

No changes in this release.

##### `augurs-changepoint`

No changes in this release.

### [`v0.9.0`](https://redirect.github.com/grafana/augurs/blob/HEAD/CHANGELOG.md#090---2025-01-14)

[Compare Source](https://redirect.github.com/grafana/augurs/compare/884cf68d9c046f114fd7682c23c922b6f436bdfe...1769039e7e50270bae6b0a25d2343d95d2153684)

##### `augurs-changepoint`

No changes in this release.

##### `augurs-clustering`

##### Changed

- *(clustering)* \[**breaking**] use new DbscanCluster type instead of isize ([#&#8203;233](https://redirect.github.com/grafana/augurs/pull/233))

This changes the return type of `DbscanClusterer::fit` from `Vec<isize>` to `Vec<DbscanCluster>`, which is a more self-explanatory type.
The ID of the first cluster is now `1` (instead of `0`), and the IDs of the subsequent clusters are incremented by `1`.

##### `augurs-core`

##### Added

- exposed `FloatIterExt` with helper methods for calculating summary statistics on iterators over floats ([#&#8203;227](https://redirect.github.com/grafana/augurs/pull/227))

##### `augurs-dtw`

No changes in this release.

##### `augurs-ets`

No changes in this release.

##### `augurs-forecaster`

##### Added

- allow ignoring NaNs in power transforms ([#&#8203;234](https://redirect.github.com/grafana/augurs/pull/234))
- add NaN handling to MinMaxScaler and StandardScaler ([#&#8203;227](https://redirect.github.com/grafana/augurs/pull/227))

##### `augurs-mstl`

No changes in this release.

##### `augurs-outlier`

No changes in this release.

##### `augurs-prophet`

No changes in this release.

#### chore(deps): update swc monorepo ([#111](https://github.com/grafana/scenes-ml/pull/111))

<details>
<summary>swc-project/swc (@&#8203;swc/core)</summary>

### [`v1.15.18`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11518---2026-03-01)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.17...v1.15.18)

##### Bug Fixes

- **(html/wasm)** Publish [@&#8203;swc/html-wasm](https://redirect.github.com/swc/html-wasm) for nodejs ([#&#8203;11601](https://redirect.github.com/swc-project/swc/issues/11601)) ([bd443f5](https://redirect.github.com/swc-project/swc/commit/bd443f582c553e9d898a1d5e7395abaad60b26d2))

##### Documentation

- Add AGENTS note about next-gen ast ([#&#8203;11592](https://redirect.github.com/swc-project/swc/issues/11592)) ([80b4be8](https://redirect.github.com/swc-project/swc/commit/80b4be872d85dc82cbb6e84c91fe102d807a2780))

- Add typescript-eslint AST compatibility note ([#&#8203;11598](https://redirect.github.com/swc-project/swc/issues/11598)) ([c7bfebe](https://redirect.github.com/swc-project/swc/commit/c7bfebec4fb691e6e49f3c3b7b257be178e7f238))

##### Features

- **(es/ast)** Add runtime arena crate and bootstrap swc\_es\_ast ([#&#8203;11588](https://redirect.github.com/swc-project/swc/issues/11588)) ([7a06d96](https://redirect.github.com/swc-project/swc/commit/7a06d967e43fe2f84078fc241bc655b41450d2c1))

- **(es/parser)** Add `swc_es_parser` ([#&#8203;11593](https://redirect.github.com/swc-project/swc/issues/11593)) ([f11fd70](https://redirect.github.com/swc-project/swc/commit/f11fd705ee84909f6b0f984b1b5fc35abf73ec05))

##### Ci

- Triage main CI breakage ([#&#8203;11589](https://redirect.github.com/swc-project/swc/issues/11589)) ([075af57](https://redirect.github.com/swc-project/swc/commit/075af578c46c0bfdb74c450c157d0e1753024a36))

### [`v1.15.17`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11517---2026-02-26)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.13...v1.15.17)

##### Documentation

- Add submodule update step before test runs ([#&#8203;11576](https://redirect.github.com/swc-project/swc/issues/11576)) ([81b22c3](https://redirect.github.com/swc-project/swc/commit/81b22c31d1acb447caae1a2d2bd530b2e6a40c26))

##### Features

- **(bindings)** Add html wasm binding and publish wiring ([#&#8203;11587](https://redirect.github.com/swc-project/swc/issues/11587)) ([b3869c3](https://redirect.github.com/swc-project/swc/commit/b3869c3ae2a592d4539f4cbfbabeaf615e55d69e))

- **(sourcemap)** Support safe scopes round-trip metadata ([#&#8203;11581](https://redirect.github.com/swc-project/swc/issues/11581)) ([de2a348](https://redirect.github.com/swc-project/swc/commit/de2a348daed80e47c75dabaf2f0ce945d850210a))

- Emit ECMA-426 source map scopes behind experimental flag ([#&#8203;11582](https://redirect.github.com/swc-project/swc/issues/11582)) ([2385a22](https://redirect.github.com/swc-project/swc/commit/2385a2279ee71abca3ae485d04a800e24bf55bae))

### [`v1.15.13`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11513---2026-02-23)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.11...v1.15.13)

##### Bug Fixes

- **(errors)** Avoid panic on invalid diagnostic spans ([#&#8203;11561](https://redirect.github.com/swc-project/swc/issues/11561)) ([b24b8e0](https://redirect.github.com/swc-project/swc/commit/b24b8e0253e4e2db4a36a2180906d65ee89495da))

- **(es/helpers)** Fix `_object_without_properties` crash on primitive values ([#&#8203;11571](https://redirect.github.com/swc-project/swc/issues/11571)) ([4f35904](https://redirect.github.com/swc-project/swc/commit/4f35904ebfc7d924b75635af4166dd8e2b26c069))

- **(es/jsx)** Preserve whitespace before HTML entities ([#&#8203;11521](https://redirect.github.com/swc-project/swc/issues/11521)) ([64be077](https://redirect.github.com/swc-project/swc/commit/64be077515ee15501b179ebe523fa68d2c29f905))

- **(es/minifier)** Do not merge if statements with different local variable values ([#&#8203;11518](https://redirect.github.com/swc-project/swc/issues/11518)) ([3e63627](https://redirect.github.com/swc-project/swc/commit/3e636273d4ba0563c9fa15736cfa4c57d80c943d))

- **(es/minifier)** Prevent convert\_tpl\_to\_str when there's emoji under es5 ([#&#8203;11529](https://redirect.github.com/swc-project/swc/issues/11529)) ([ff6cf88](https://redirect.github.com/swc-project/swc/commit/ff6cf88c88497881839ccb40fa18d33225971203))

- **(es/minifier)** Inline before merge if ([#&#8203;11526](https://redirect.github.com/swc-project/swc/issues/11526)) ([aa5a9ac](https://redirect.github.com/swc-project/swc/commit/aa5a9ac3ebae1f2a5775d980da65bc6a1c2574d7))

- **(es/minifier)** Preserve array join("") nullish semantics ([#&#8203;11558](https://redirect.github.com/swc-project/swc/issues/11558)) ([d477f61](https://redirect.github.com/swc-project/swc/commit/d477f61d85de8d88113e886f5e5d8076192ca76a))

- **(es/minifier)** Inline side-effect-free default params ([#&#8203;11564](https://redirect.github.com/swc-project/swc/issues/11564)) ([1babda7](https://redirect.github.com/swc-project/swc/commit/1babda721a42de7a85cd0da6f6231f9a67c54bfa))

- **(es/parser)** Fix generic arrow function in TSX mode ([#&#8203;11549](https://redirect.github.com/swc-project/swc/issues/11549)) ([366a16b](https://redirect.github.com/swc-project/swc/commit/366a16b4a469d61ca816ec8187d3d476a57860d7))

- **(es/react)** Preserve first-line leading whitespace with entities ([#&#8203;11568](https://redirect.github.com/swc-project/swc/issues/11568)) ([fc62617](https://redirect.github.com/swc-project/swc/commit/fc62617f31707bb464dc167d3317dcc705aecd4c))

- **(es/regexp)** Transpile unicode property escapes in RegExp constructor ([#&#8203;11554](https://redirect.github.com/swc-project/swc/issues/11554)) ([476d544](https://redirect.github.com/swc-project/swc/commit/476d544f911ea643fcc8434e46aaddd344fa49f8))

##### Documentation

- **(agents)** Clarify sandbox escalation for progress ([#&#8203;11574](https://redirect.github.com/swc-project/swc/issues/11574)) ([cb31d0d](https://redirect.github.com/swc-project/swc/commit/cb31d0da37b35858986ba63e0dab300555f8ec82))

##### Features

- **(es/minifier)** Add `unsafe_hoist_static_method_alias` option ([#&#8203;11493](https://redirect.github.com/swc-project/swc/issues/11493)) ([6e7dbe2](https://redirect.github.com/swc-project/swc/commit/6e7dbe234555f926f98d8714789b5cd4a5e65b3d))

- **(es/minifier)** Remove unused args for IIFE ([#&#8203;11536](https://redirect.github.com/swc-project/swc/issues/11536)) ([3cc286b](https://redirect.github.com/swc-project/swc/commit/3cc286b2f16489c8175faf5a72601c5be1376bdc))

##### Refactor

- **(es/parser)** Compare token kind rather than strings ([#&#8203;11531](https://redirect.github.com/swc-project/swc/issues/11531)) ([5872ffa](https://redirect.github.com/swc-project/swc/commit/5872ffa74a5b214bd6fd03732a26479118c41011))

- **(es/typescript)** Run typescript transform in two passes ([#&#8203;11532](https://redirect.github.com/swc-project/swc/issues/11532)) ([b069558](https://redirect.github.com/swc-project/swc/commit/b06955813af93cd784aad90e7e98ab06fb648438))

- **(es/typescript)** Precompute namespace import-equals usage in semantic pass ([#&#8203;11534](https://redirect.github.com/swc-project/swc/issues/11534)) ([b7e87c7](https://redirect.github.com/swc-project/swc/commit/b7e87c7b951cb8f62d6b22a5cfa2105310a91ccc))

##### Testing

- **(es/minifier)** Add execution tests for issue [#&#8203;11517](https://redirect.github.com/swc-project/swc/issues/11517) ([#&#8203;11530](https://redirect.github.com/swc-project/swc/issues/11530)) ([01b3b64](https://redirect.github.com/swc-project/swc/commit/01b3b648114ddb2e1e5ded32856397b996cb9fc2))

- Disable `cva` ecosystem ci temporariliy ([55bc966](https://redirect.github.com/swc-project/swc/commit/55bc966be4e2a393b926317e228f6d33eacb7715))

##### Ci

- Reset closed issue and PR milestone to Planned ([#&#8203;11559](https://redirect.github.com/swc-project/swc/issues/11559)) ([d5c4ebe](https://redirect.github.com/swc-project/swc/commit/d5c4ebe3d991b05697f01d8fb67efe7ad708a1f8))

- Add permission ([431c576](https://redirect.github.com/swc-project/swc/commit/431c5764b84d43fad0e30d25dcc0a8e049e8beae))

### [`v1.15.11`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11511---2026-01-27)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.10...v1.15.11)

##### Bug Fixes

- **(es/codegen)** Emit leading comments for JSX elements, fragments, and empty expressions ([#&#8203;11488](https://redirect.github.com/swc-project/swc/issues/11488)) ([1520633](https://redirect.github.com/swc-project/swc/commit/1520633549965eb6838c80d4389431074613bd0e))

- **(es/decorators)** Invoke addInitializer callbacks for decorated fields ([#&#8203;11495](https://redirect.github.com/swc-project/swc/issues/11495)) ([11cfe4d](https://redirect.github.com/swc-project/swc/commit/11cfe4deaea8c66cd1f78e8894b4df11ebdbe0f7))

- **(es/es3)** Visit export decl body even if name is not reserved ([#&#8203;11473](https://redirect.github.com/swc-project/swc/issues/11473)) ([9113fff](https://redirect.github.com/swc-project/swc/commit/9113fffc8cae6d379c5ce7bfd9f5373f6ee9a3aa))

- **(es/es3)** Remove duplicate code ([#&#8203;11499](https://redirect.github.com/swc-project/swc/issues/11499)) ([fbee775](https://redirect.github.com/swc-project/swc/commit/fbee7752443e491ce24b590e00d78677b7e4c8f4))

- **(es/minifier)** Treat new expression with empty class as side-effect free ([#&#8203;11455](https://redirect.github.com/swc-project/swc/issues/11455)) ([a33a45e](https://redirect.github.com/swc-project/swc/commit/a33a45e3bd4e6227d143174198d36f7cbc4b9f2b))

- **(es/minifier)** Escape control characters when converting strings to template literals ([#&#8203;11464](https://redirect.github.com/swc-project/swc/issues/11464)) ([028551f](https://redirect.github.com/swc-project/swc/commit/028551f4f0d00c3880df8af324d3b5eb2637cfb9))

- **(es/minifier)** Handle unused parameters with default values ([#&#8203;11494](https://redirect.github.com/swc-project/swc/issues/11494)) ([6ed1ee9](https://redirect.github.com/swc-project/swc/commit/6ed1ee9ca1e816aedfe0387d240479c1dbfcffef))

- **(es/module)** Preserve ./ prefix for hidden directory imports ([#&#8203;11489](https://redirect.github.com/swc-project/swc/issues/11489)) ([a005391](https://redirect.github.com/swc-project/swc/commit/a0053916e786711be01f73c767e3c2283c9fb4f6))

- **(es/parser)** Validate dynamic import argument count ([#&#8203;11462](https://redirect.github.com/swc-project/swc/issues/11462)) ([2f67591](https://redirect.github.com/swc-project/swc/commit/2f67591e2c9bb41a711d739e6bc81d20a673bfd6))

- **(es/parser)** Allow compilation with --no-default-features ([#&#8203;11460](https://redirect.github.com/swc-project/swc/issues/11460)) ([b70c5f8](https://redirect.github.com/swc-project/swc/commit/b70c5f8ade85c3e4a17e0fed61ce850ab6b1f53c))

- **(es/parser)** Skip emitting TS1102 in TypeScript mode ([#&#8203;11463](https://redirect.github.com/swc-project/swc/issues/11463)) ([e6f5b06](https://redirect.github.com/swc-project/swc/commit/e6f5b06561c1d87d0235aea5cfce9c253afdcc74))

- **(es/parser)** Reject ambiguous generic arrow functions in TSX mode ([#&#8203;11491](https://redirect.github.com/swc-project/swc/issues/11491)) ([ac00915](https://redirect.github.com/swc-project/swc/commit/ac00915ba027bbb2c805ad0abd8d945d7dcf4055))

- **(es/parser)** Disallow NumericLiteralSeparator with BigInts ([#&#8203;11510](https://redirect.github.com/swc-project/swc/issues/11510)) ([6b3644b](https://redirect.github.com/swc-project/swc/commit/6b3644b9ca58530a5e0bb92586bdf8210b89124f))

- **(es/react)** Preserve HTML entity-encoded whitespace in JSX ([#&#8203;11474](https://redirect.github.com/swc-project/swc/issues/11474)) ([7d433a9](https://redirect.github.com/swc-project/swc/commit/7d433a95ccc372535b4f5b9dc691cbd313c2f388))

- **(es/renamer)** Prevent duplicate parameter names with destructuring patterns ([#&#8203;11456](https://redirect.github.com/swc-project/swc/issues/11456)) ([e25a2c8](https://redirect.github.com/swc-project/swc/commit/e25a2c82db0e33c098a8ecd19bb933115e74ac1a))

- **(es/testing)** Skip update when expected output has invalid code ([#&#8203;11469](https://redirect.github.com/swc-project/swc/issues/11469)) ([2be6b8a](https://redirect.github.com/swc-project/swc/commit/2be6b8a1fe3f55c30655f82dcf0cf6c04aa9a331))

- **(es/typescript)** Don't mark enums with opaque members as pure ([#&#8203;11452](https://redirect.github.com/swc-project/swc/issues/11452)) ([b713fae](https://redirect.github.com/swc-project/swc/commit/b713fae8cc1b4fb7a45ffb4bf4a7e9d1facb651f))

- **(preset-env)** Distinguish unknown browser vs empty config ([#&#8203;11457](https://redirect.github.com/swc-project/swc/issues/11457)) ([1310957](https://redirect.github.com/swc-project/swc/commit/1310957bec15ce2352dcb2dde8adb77664625c69))

##### Documentation

- Replace swc.config.js references with .swcrc ([#&#8203;11485](https://redirect.github.com/swc-project/swc/issues/11485)) ([fec8d2c](https://redirect.github.com/swc-project/swc/commit/fec8d2cbb8e7f5eaaed369dd1b45347839fa0c18))

##### Features

- **(cli)** Add --root-mode argument for .swcrc resolution ([#&#8203;11501](https://redirect.github.com/swc-project/swc/issues/11501)) ([b53a0e2](https://redirect.github.com/swc-project/swc/commit/b53a0e2a98a7556c5f8a74270a717e4078793053))

- **(es/module)** Make module transforms optional via `module` feature ([#&#8203;11509](https://redirect.github.com/swc-project/swc/issues/11509)) ([b94a178](https://redirect.github.com/swc-project/swc/commit/b94a17851c9032e0e17c3c9912cfdb60d00722f4))

- **(es/regexp)** Implement unicode property escape transpilation ([#&#8203;11472](https://redirect.github.com/swc-project/swc/issues/11472)) ([a2e0ba0](https://redirect.github.com/swc-project/swc/commit/a2e0ba0151fdde2c11c093d3ab2960410f4ffb86))

- **(es/transformer)** Merge ES3 hooks into swc\_ecma\_transformer ([#&#8203;11503](https://redirect.github.com/swc-project/swc/issues/11503)) ([5efcac9](https://redirect.github.com/swc-project/swc/commit/5efcac946f5cf88e900da2867dc8b92c411bdd18))

##### Miscellaneous Tasks

- **(es/minifier)** Extend OrderedChain to support more node types ([#&#8203;11477](https://redirect.github.com/swc-project/swc/issues/11477)) ([aa9d789](https://redirect.github.com/swc-project/swc/commit/aa9d789953fc8e62e07b91e25137573d3a4d70d7))

##### Performance

- **(bindings)** Optimize string handling by avoiding unnecessary clones ([#&#8203;11490](https://redirect.github.com/swc-project/swc/issues/11490)) ([81daaaa](https://redirect.github.com/swc-project/swc/commit/81daaaa054a579fd2b425c5362b33ffc90471e6f))

- **(es/codegen)** Make `commit_pending_semi` explicit in `write_punct` ([#&#8203;11492](https://redirect.github.com/swc-project/swc/issues/11492)) ([5a27fc0](https://redirect.github.com/swc-project/swc/commit/5a27fc0c49872098339bf897957af5a6b459abf9))

- **(es/es2015)** Port ES2015 transforms to hook-based visitors ([#&#8203;11484](https://redirect.github.com/swc-project/swc/issues/11484)) ([a54eb0e](https://redirect.github.com/swc-project/swc/commit/a54eb0ef7518f759e52636162870f90233ef8532))

- **(es/es3)** Use hooks pattern for single AST traversal ([#&#8203;11483](https://redirect.github.com/swc-project/swc/issues/11483)) ([a139fba](https://redirect.github.com/swc-project/swc/commit/a139fba3b9aca632e02e64333312c989f10e0ef8))

- **(es/minifier)** Use combined AST traversal ([#&#8203;11471](https://redirect.github.com/swc-project/swc/issues/11471)) ([c611663](https://redirect.github.com/swc-project/swc/commit/c611663e9f22293233d5bd8084c3de703dec8b14))

- **(es/transformer)** Add inline hint ([#&#8203;11508](https://redirect.github.com/swc-project/swc/issues/11508)) ([d72c9df](https://redirect.github.com/swc-project/swc/commit/d72c9df7e390389c3f9a2645341f920c5d42d0db))

##### Refactor

- **(es/compat)** Put ES3 crates behind feature flag ([#&#8203;11480](https://redirect.github.com/swc-project/swc/issues/11480)) ([d5a8d84](https://redirect.github.com/swc-project/swc/commit/d5a8d8447a6a4517372a5d52151e6732d74a1ade))

##### Testing

- **(es/minifier)** Add test case for `merge_imports` order preservation ([#&#8203;11458](https://redirect.github.com/swc-project/swc/issues/11458)) ([b874a05](https://redirect.github.com/swc-project/swc/commit/b874a05d5cde160c4d40f0d73f871fdb1746a753))

- **(es/parser)** Add error tests for import.source and import.defer with too many args ([#&#8203;11466](https://redirect.github.com/swc-project/swc/issues/11466)) ([7313462](https://redirect.github.com/swc-project/swc/commit/731346282ebdb11fd3a1fb6b558cc83982e4afcb))

- **(es/parser)** Check `handler.has_errors()` in test error parsing ([#&#8203;11487](https://redirect.github.com/swc-project/swc/issues/11487)) ([fade647](https://redirect.github.com/swc-project/swc/commit/fade647452ed288d42336a4c5580b49bd4953e23))

- Replace deprecated `cargo_bin` function with `cargo_bin!` macro ([#&#8203;11461](https://redirect.github.com/swc-project/swc/issues/11461)) ([73f77b6](https://redirect.github.com/swc-project/swc/commit/73f77b6331b1501592315b78babcc96d9ae9b483))

### [`v1.15.10`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11510---2026-01-19)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.8...v1.15.10)

##### Bug Fixes

- **(ci)** Handle merged PRs separately in milestone manager ([#&#8203;11409](https://redirect.github.com/swc-project/swc/issues/11409)) ([3554268](https://redirect.github.com/swc-project/swc/commit/3554268dcb7c8af4abfe0a06e61a382a23c4a3eb))

- **(es/compat)** Preserve this context in nested arrow functions ([#&#8203;11423](https://redirect.github.com/swc-project/swc/issues/11423)) ([f2bdaf2](https://redirect.github.com/swc-project/swc/commit/f2bdaf27d869a6d54a3dd47cd47e63c5b39a4d5c))

- **(es/es2017)** Replace `this` in arrow functions during async-to-generator ([#&#8203;11450](https://redirect.github.com/swc-project/swc/issues/11450)) ([a993da6](https://redirect.github.com/swc-project/swc/commit/a993da6fb6e43bdbc2cd3a288c8b5be1b79e08c0))

##### Features

- **(bindings/wasm)** Enable ecma\_lints feature to support semantic error detection ([#&#8203;11414](https://redirect.github.com/swc-project/swc/issues/11414)) ([1faa4a5](https://redirect.github.com/swc-project/swc/commit/1faa4a57454ef3932c75a1aca7dd36e37bb215d3))

- **(es/hooks)** Implement VisitMutHook for Either type ([#&#8203;11428](https://redirect.github.com/swc-project/swc/issues/11428)) ([395c85e](https://redirect.github.com/swc-project/swc/commit/395c85e921eeb0cad661c8714d97372970cbfb6c))

- **(es/hooks)** Implement VisitMutHook for Option<H> ([#&#8203;11429](https://redirect.github.com/swc-project/swc/issues/11429)) ([0bf1954](https://redirect.github.com/swc-project/swc/commit/0bf195421de167b3a01f710be7578d1cedf033b9))

- **(es/hooks)** Add VisitHook trait for immutable AST visitors ([#&#8203;11437](https://redirect.github.com/swc-project/swc/issues/11437)) ([3efb41d](https://redirect.github.com/swc-project/swc/commit/3efb41d97e2cdb1d593c55c841c016eb2958ee72))

- **(es/minifier)** Improve nested template literal evaluation ([#&#8203;11411](https://redirect.github.com/swc-project/swc/issues/11411)) ([147df2f](https://redirect.github.com/swc-project/swc/commit/147df2f0233c4b701311675dc7c237ee18f0c854))

- **(es/minifier)** Remove inlined IIFE arg and param ([#&#8203;11436](https://redirect.github.com/swc-project/swc/issues/11436)) ([2bc5d40](https://redirect.github.com/swc-project/swc/commit/2bc5d402ade64f84523bfa7cf0c2da88ef494ad6))

- **(es/minifier)** Remove inlined IIFE arg and param ([#&#8203;11446](https://redirect.github.com/swc-project/swc/issues/11446)) ([baa1ae3](https://redirect.github.com/swc-project/swc/commit/baa1ae3510668f9969bf5cd73ba4e3d66aa74fa0))

##### Miscellaneous Tasks

- **(deps)** Update `rkyv` ([#&#8203;11419](https://redirect.github.com/swc-project/swc/issues/11419)) ([432197b](https://redirect.github.com/swc-project/swc/commit/432197bdc7c574fbd8829ad5a6e0b3108ccb1d3c))

- **(deps)** Update lru to 0.16.3 ([#&#8203;11438](https://redirect.github.com/swc-project/swc/issues/11438)) ([67c2d75](https://redirect.github.com/swc-project/swc/commit/67c2d752910c945732cf4deebf2af0f8a110e880))

- **(deps)** Update browserslist-data to v0.1.5 ([#&#8203;11454](https://redirect.github.com/swc-project/swc/issues/11454)) ([e9f78f0](https://redirect.github.com/swc-project/swc/commit/e9f78f032f7d85a500037cdc82babdcf2d2be99a))

- **(helpers)** Replace MagicString with ast-grep's built-in edit API ([#&#8203;11410](https://redirect.github.com/swc-project/swc/issues/11410)) ([a3f0d33](https://redirect.github.com/swc-project/swc/commit/a3f0d33916f7ad225d8320c499a8dd0f7b46e5b9))

- **(hstr/wtf8)** Address legacy FIXME comments by switching to derives ([#&#8203;11416](https://redirect.github.com/swc-project/swc/issues/11416)) ([f03bfd8](https://redirect.github.com/swc-project/swc/commit/f03bfd8dd15630acbcdb011d64bdea5c1a0ccf79))

##### Performance

- **(es/codegen, es/utils)** Migrate to dragonbox\_ecma for faster Number::toString ([#&#8203;11412](https://redirect.github.com/swc-project/swc/issues/11412)) ([b7978cc](https://redirect.github.com/swc-project/swc/commit/b7978cc9dbe92b26d781748d09ad50e2f1a6343b))

- **(es/react)** Optimize JSX transforms to reduce allocations ([#&#8203;11425](https://redirect.github.com/swc-project/swc/issues/11425)) ([2a20cb6](https://redirect.github.com/swc-project/swc/commit/2a20cb6e34bed4260efe2a1b87165f52f9b3d45c))

##### Refactor

- **(es)** Improve TypeScript transform configuration structure ([#&#8203;11434](https://redirect.github.com/swc-project/swc/issues/11434)) ([f33a975](https://redirect.github.com/swc-project/swc/commit/f33a975c74f63f8d8e3c05db5166912c432ae18b))

- **(es/minifier)** Migrate MinifierPass to Pass trait ([#&#8203;11442](https://redirect.github.com/swc-project/swc/issues/11442)) ([a41e631](https://redirect.github.com/swc-project/swc/commit/a41e63193c86290f20fec6529d7aa944562df713))

- **(es/minifier)** Improve tpl to str ([#&#8203;11415](https://redirect.github.com/swc-project/swc/issues/11415)) ([0239523](https://redirect.github.com/swc-project/swc/commit/0239523c3863f3c0c8f8a3c7d486b64213fc60ff))

- **(es/react)** Port to VisitMutHook ([#&#8203;11418](https://redirect.github.com/swc-project/swc/issues/11418)) ([9604d9c](https://redirect.github.com/swc-project/swc/commit/9604d9cc8a3d265d66ab32c1f70c25031b09cc18))

- **(es/transformer)** Remove OptionalHook wrapper in favor of Option<H> ([#&#8203;11430](https://redirect.github.com/swc-project/swc/issues/11430)) ([72da6bd](https://redirect.github.com/swc-project/swc/commit/72da6bdd526eff0fdde76f22a978cbec736b9d3c))

- **(es/transforms)** Migrate TypeScript transform to Pass trait ([#&#8203;11439](https://redirect.github.com/swc-project/swc/issues/11439)) ([dd007c6](https://redirect.github.com/swc-project/swc/commit/dd007c64a691d37f6d4903624a8dfa39d389f912))

##### Testing

- **(es)** Enable benchmark for `swc` ([#&#8203;11420](https://redirect.github.com/swc-project/swc/issues/11420)) ([3a50a25](https://redirect.github.com/swc-project/swc/commit/3a50a2592784a418ef3312b0f445bde2762959ca))

- Disable LTO for benchmarks ([#&#8203;11421](https://redirect.github.com/swc-project/swc/issues/11421)) ([af3c2d3](https://redirect.github.com/swc-project/swc/commit/af3c2d36d772eab7905db717f8be2080fd14abec))

- Use rstest as the test framework ([#&#8203;11417](https://redirect.github.com/swc-project/swc/issues/11417)) ([fae258f](https://redirect.github.com/swc-project/swc/commit/fae258f530d2f54fa148f90225e9a7740de57d96))

##### Ci

- Collapse preivous `claude[bot]` PR review comments ([affb6a2](https://redirect.github.com/swc-project/swc/commit/affb6a29de9a511148a3483149aa5a574720fccf))

### [`v1.15.8`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1158---2025-12-30)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.7...v1.15.8)

##### Bug Fixes

- **(es/minifier)** Remove unused webpack-related code ([#&#8203;11397](https://redirect.github.com/swc-project/swc/issues/11397)) ([8e4eab4](https://redirect.github.com/swc-project/swc/commit/8e4eab4c900d5a870788388cd32c35a32104643d))

- **(es/minifier)** Evaluate TemplateLiteral in BinaryExpression ([#&#8203;11406](https://redirect.github.com/swc-project/swc/issues/11406)) ([8d1b6f6](https://redirect.github.com/swc-project/swc/commit/8d1b6f613e61b7d7cf9ac9b9071bbe671b8baa8c))

- **(es/minifier)** More strict check if cannot add ident when invoking IIFE ([#&#8203;11399](https://redirect.github.com/swc-project/swc/issues/11399)) ([03642aa](https://redirect.github.com/swc-project/swc/commit/03642aafd32af9d07803603795ae13b0fc80bf3a))

##### Features

- **(es/minifier)** Support BinaryExpression for Evaluator ([#&#8203;11390](https://redirect.github.com/swc-project/swc/issues/11390)) ([6c76f0a](https://redirect.github.com/swc-project/swc/commit/6c76f0adc39cbc72cbf3b81fdc2f521a5d0b6f7b))

- **(es/transformer)** Merge `static_blocks` ([#&#8203;11403](https://redirect.github.com/swc-project/swc/issues/11403)) ([55a5083](https://redirect.github.com/swc-project/swc/commit/55a5083f02e2eabd79e0839268f0a74aff2f69a4))

##### Performance

- **(es/parser)** Remove `Iterator` implementation for `Lexer` ([#&#8203;11393](https://redirect.github.com/swc-project/swc/issues/11393)) ([5941018](https://redirect.github.com/swc-project/swc/commit/59410188a2037ab88b516cddf4401149cc739ee8))

- **(es/parser)** Optimize `do_outside_of_context` and `do_inside_of_context` ([#&#8203;11394](https://redirect.github.com/swc-project/swc/issues/11394)) ([4210cf1](https://redirect.github.com/swc-project/swc/commit/4210cf1ca1ec37a624cbeb36d8821855c3f56d41))

- **(es/parser)** Remove `is_first` in lexer state ([#&#8203;11395](https://redirect.github.com/swc-project/swc/issues/11395)) ([97d903b](https://redirect.github.com/swc-project/swc/commit/97d903b4e580e99d0a02463c0a38e780f76bd274))

- **(es/parser)** Use `byte_search` to optimize `scan_jsx_token` ([#&#8203;11398](https://redirect.github.com/swc-project/swc/issues/11398)) ([f9b4da2](https://redirect.github.com/swc-project/swc/commit/f9b4da2bd85d160b3ee4b3296ed520388675b90e))

- Reduce binary size with panic=abort and ICU optimizations ([#&#8203;11401](https://redirect.github.com/swc-project/swc/issues/11401)) ([18088b2](https://redirect.github.com/swc-project/swc/commit/18088b29826acd0948e9682e0de5ab47db399d32))

##### Refactor

- **(es/compiler)** Drop the crate ([#&#8203;11407](https://redirect.github.com/swc-project/swc/issues/11407)) ([8faa14e](https://redirect.github.com/swc-project/swc/commit/8faa14ec0882dc20780fdc2c1fdba93d6cde7772))

- **(es/minifier)** Move drop\_console and unsafes from Pure to Optimizer ([#&#8203;11388](https://redirect.github.com/swc-project/swc/issues/11388)) ([ee40804](https://redirect.github.com/swc-project/swc/commit/ee408042547f0c3fe4d3a5dd2599a7846b619852))

- **(es/parser)** Distinguish JsxText from Str ([#&#8203;11387](https://redirect.github.com/swc-project/swc/issues/11387)) ([63c4c44](https://redirect.github.com/swc-project/swc/commit/63c4c440a135be06179b4fdc03a2b7a5e9606c1c))

### [`v1.15.7`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1157---2025-12-18)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.6...v1.15.7)

##### Bug Fixes

- **(es/minifier)** Prevent unsafe sequence merging in `super()` calls ([#&#8203;11381](https://redirect.github.com/swc-project/swc/issues/11381)) ([eb02780](https://redirect.github.com/swc-project/swc/commit/eb02780a126cd70da830079fc54168d632d18a4d))

- **(es/transformer)** Fix variable declaration for nullish coalescing in else-if branches ([#&#8203;11384](https://redirect.github.com/swc-project/swc/issues/11384)) ([6746002](https://redirect.github.com/swc-project/swc/commit/67460026176cb97a5bfa59a439da59b70447e897))

- **(es/transforms)** Update `_ts_rewrite_relative_import_extension` helper code ([#&#8203;11382](https://redirect.github.com/swc-project/swc/issues/11382)) ([1ec444e](https://redirect.github.com/swc-project/swc/commit/1ec444e998fd1aff29b7e674254d1c95e2de2ba0))

##### Features

- **(es/transformer)** Merge `private_properties_in_object` ([#&#8203;11378](https://redirect.github.com/swc-project/swc/issues/11378)) ([769c9d2](https://redirect.github.com/swc-project/swc/commit/769c9d2938edab63a0f109fc1bf7cad3e40a4619))

##### Performance

- **(es/minifier)** Optimize data structures of `ProgramData` ([#&#8203;11374](https://redirect.github.com/swc-project/swc/issues/11374)) ([3639523](https://redirect.github.com/swc-project/swc/commit/36395237e7efff0698a2b575e0ad7822381437e3))

##### Refactor

- **(es/transformer)** Port var injector ([#&#8203;11383](https://redirect.github.com/swc-project/swc/issues/11383)) ([cfff553](https://redirect.github.com/swc-project/swc/commit/cfff5536ac0e5f9051e5a4bb650eac028c7e6067))

### [`v1.15.6`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1156---2025-12-18)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.5...v1.15.6)

##### Bug Fixes

- **(es/transformer)** Fix missing var declaration in nullish coalescing with spreads ([#&#8203;11377](https://redirect.github.com/swc-project/swc/issues/11377)) ([686d154](https://redirect.github.com/swc-project/swc/commit/686d154c1e8aa45c16b45d8b0ed1a921fae5eb39))

##### Performance

- **(es/parser)** Remove `raw`s in `TokenValue` ([#&#8203;11373](https://redirect.github.com/swc-project/swc/issues/11373)) ([78a5327](https://redirect.github.com/swc-project/swc/commit/78a532726560738f363e812ec4940d0580140576))

### [`v1.15.5`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1155---2025-12-15)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.4...v1.15.5)

##### Bug Fixes

- **(es/parser)** Fix `bump` length ([#&#8203;11372](https://redirect.github.com/swc-project/swc/issues/11372)) ([ec5c1bc](https://redirect.github.com/swc-project/swc/commit/ec5c1bc5bf23249fd7cbd786ab735f9abb4ed9cb))

- **(es/transforms)** Adjust import rewriter pass before inject helpers pass ([#&#8203;11371](https://redirect.github.com/swc-project/swc/issues/11371)) ([8516991](https://redirect.github.com/swc-project/swc/commit/8516991cb5316b1fbdc7d52daa6f64b9ca9e0f32))

### [`v1.15.4`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1154---2025-12-13)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.3...v1.15.4)

##### Bug Fixes

- **(es/compat)** Preserve return value for single-property object destructuring ([#&#8203;11334](https://redirect.github.com/swc-project/swc/issues/11334)) ([847ad22](https://redirect.github.com/swc-project/swc/commit/847ad222a9a95e189850172345b0c26dfeb6c225))

- **(es/compat)** Fix generator transform for compound assignments, for-in, and labeled break ([#&#8203;11339](https://redirect.github.com/swc-project/swc/issues/11339)) ([9b6bedd](https://redirect.github.com/swc-project/swc/commit/9b6bedd6dab07f81808ee949c769c24e7ecda8a0))

- **(es/compat)** Destructuring evaluation order ([#&#8203;11337](https://redirect.github.com/swc-project/swc/issues/11337)) ([49d04c7](https://redirect.github.com/swc-project/swc/commit/49d04c750dc771a6b4a01ae7a0b438f48098a485))

- **(es/compat)** Fix parameter default value evaluation order with object rest ([#&#8203;11352](https://redirect.github.com/swc-project/swc/issues/11352)) ([2ebb261](https://redirect.github.com/swc-project/swc/commit/2ebb261c90ab24290a8b972bd4bd7b5b452ddefc))

- **(es/fixer)** Preserve parens around IFFE in binary expressions within sequences ([#&#8203;11324](https://redirect.github.com/swc-project/swc/issues/11324)) ([a4c84ea](https://redirect.github.com/swc-project/swc/commit/a4c84ea7807839a87300d2e931b6a457f248b33a))

- **(es/helpers)** Avoid extra trap calls on excluded keys in object rest spread ([#&#8203;11338](https://redirect.github.com/swc-project/swc/issues/11338)) ([4662caf](https://redirect.github.com/swc-project/swc/commit/4662caf427c67a2aea7dade478b0f7c00276b30e))

- **(es/minifier)** Fix `debug` cargo feature ([#&#8203;11325](https://redirect.github.com/swc-project/swc/issues/11325)) ([be86fad](https://redirect.github.com/swc-project/swc/commit/be86fad7e9b935faac2da7d881a6991295a6dbad))

- **(es/minifier)** Fix optimization pass for `merge_imports` ([#&#8203;11331](https://redirect.github.com/swc-project/swc/issues/11331)) ([ca2f7ed](https://redirect.github.com/swc-project/swc/commit/ca2f7ed0d06c7d0971102875a5463176d0dd5204))

- **(es/parser)** Don't call `bump_bytes` in the `continue_if` of `byte_search!` ([#&#8203;11328](https://redirect.github.com/swc-project/swc/issues/11328)) ([583619d](https://redirect.github.com/swc-project/swc/commit/583619d019b548621becb8fb0c895dd9ce85da71))

- **(es/parser)** Support type-only string literal in import specifiers ([#&#8203;11333](https://redirect.github.com/swc-project/swc/issues/11333)) ([07762f1](https://redirect.github.com/swc-project/swc/commit/07762f13e9ddc5e756b545cb2a6877f427733406))

- **(es/parser)** Handle TypeScript expressions in destructuring patterns ([#&#8203;11353](https://redirect.github.com/swc-project/swc/issues/11353)) ([160ec34](https://redirect.github.com/swc-project/swc/commit/160ec343404d7363e94a447be5c23bed2ab50e37))

- **(es/transformer)** Complete `replace_this_in_expr` implementation ([#&#8203;11361](https://redirect.github.com/swc-project/swc/issues/11361)) ([58c4067](https://redirect.github.com/swc-project/swc/commit/58c406723e78fbe87011450dd87edbf52508c08e))

- **(es/transformer)** Fix pass order ([#&#8203;11370](https://redirect.github.com/swc-project/swc/issues/11370)) ([373048a](https://redirect.github.com/swc-project/swc/commit/373048ae3e6ad0b344bc8aa298765a207289a861))

##### Features

- **(es/minifier)** Optimize `typeof x == "undefined"` to `typeof x > "u"` ([#&#8203;11367](https://redirect.github.com/swc-project/swc/issues/11367)) ([a5e144b](https://redirect.github.com/swc-project/swc/commit/a5e144bc6329431fcb4beb63b441627e7afce1fa))

- **(es/parser)** Support `no_paren` parser option ([#&#8203;11359](https://redirect.github.com/swc-project/swc/issues/11359)) ([5b9d77c](https://redirect.github.com/swc-project/swc/commit/5b9d77c1c89ade5772c6feee429386faf3b93a39))

- **(es/parser)** Revert `no_paren` parser option ([#&#8203;11362](https://redirect.github.com/swc-project/swc/issues/11362)) ([57a8731](https://redirect.github.com/swc-project/swc/commit/57a87313194f825efc2ce91d41fb27b8e1e9d9aa))

- **(es/transfomer)** Add modules to prepare porting ([#&#8203;11347](https://redirect.github.com/swc-project/swc/issues/11347)) ([68d740c](https://redirect.github.com/swc-project/swc/commit/68d740cc5c2097954d0a7827775af7ac0b3f7cee))

- **(es/transform)** Add common fields ([#&#8203;11346](https://redirect.github.com/swc-project/swc/issues/11346)) ([1a8759f](https://redirect.github.com/swc-project/swc/commit/1a8759f30b1d2253bd5e267f68970ca58f301b68))

- **(es/transformer)** Merge `async-to-generator` ([#&#8203;11355](https://redirect.github.com/swc-project/swc/issues/11355)) ([c388e87](https://redirect.github.com/swc-project/swc/commit/c388e870cae2e9253f1ef39f659aebe7470ea741))

- **(es/transformer)** Merge `async_to_generator` ([#&#8203;11358](https://redirect.github.com/swc-project/swc/issues/11358)) ([25f3a47](https://redirect.github.com/swc-project/swc/commit/25f3a4724d48e7fe32eebacd743f1ab623681e46))

- **(es/transformer)** Merge `object_rest_spread` ([#&#8203;11357](https://redirect.github.com/swc-project/swc/issues/11357)) ([752188e](https://redirect.github.com/swc-project/swc/commit/752188ef85d8b0b36d8d60e962d5fbe6349b6263))

- **(es/transformer)** Merge `nullish_coalescing` ([#&#8203;11365](https://redirect.github.com/swc-project/swc/issues/11365)) ([5fb686a](https://redirect.github.com/swc-project/swc/commit/5fb686a2c2fca583707406b7d2fec1a60bf9d4c9))

- **(es/transformer)** Merge `logical_assignment_operators` ([#&#8203;11369](https://redirect.github.com/swc-project/swc/issues/11369)) ([94946fa](https://redirect.github.com/swc-project/swc/commit/94946fa40b972f86c8aa006b29a49307127bceeb))

##### Performance

- **(es/compat)** Merge `exponentation_operator` ([#&#8203;11310](https://redirect.github.com/swc-project/swc/issues/11310)) ([0ef3637](https://redirect.github.com/swc-project/swc/commit/0ef3637606035ce6258c9893fe458bc80c598574))

- **(es/compat)** Merge `optional_catch_binding` ([#&#8203;11313](https://redirect.github.com/swc-project/swc/issues/11313)) ([468d20c](https://redirect.github.com/swc-project/swc/commit/468d20cf811794e2e905617b4426e8d593cbca59))

- **(es/compat)** Use merged transformer ([#&#8203;11366](https://redirect.github.com/swc-project/swc/issues/11366)) ([c4a5e79](https://redirect.github.com/swc-project/swc/commit/c4a5e7989bf0bb943051c56d03f8121d921c9f13))

- **(es/parser)** Optimize `byte_search!` ([#&#8203;11323](https://redirect.github.com/swc-project/swc/issues/11323)) ([67f67c1](https://redirect.github.com/swc-project/swc/commit/67f67c1dcb45203601d96d4e7a77cb4c16e82d79))

- **(es/parser)** Small optimization after byte-based lexer ([#&#8203;11340](https://redirect.github.com/swc-project/swc/issues/11340)) ([c92ea4e](https://redirect.github.com/swc-project/swc/commit/c92ea4ec5f32654921efaee9af8cb09dc39457df))

- **(es/parser)** Use `slice` rather than matching keywords ([#&#8203;11341](https://redirect.github.com/swc-project/swc/issues/11341)) ([b6ad2cb](https://redirect.github.com/swc-project/swc/commit/b6ad2cb114c99676c912ffa6984e50da677630cf))

- **(parser)** Make all parsers work by byte instead of char  ([#&#8203;11318](https://redirect.github.com/swc-project/swc/issues/11318)) ([725efd1](https://redirect.github.com/swc-project/swc/commit/725efd16c67f4f2d42c6b3c673cb0ad473ff0ff3))

### [`v1.15.3`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1153---2025-11-20)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.2...v1.15.3)

##### Bug Fixes

- **(es/codegen)** Restore missing top-level comments ([#&#8203;11302](https://redirect.github.com/swc-project/swc/issues/11302)) ([0998c93](https://redirect.github.com/swc-project/swc/commit/0998c93a5ad391a6cc7bd25eb08104f825a29ac4))

- **(es/codegen)** Emit comments of all nodes ([#&#8203;11314](https://redirect.github.com/swc-project/swc/issues/11314)) ([387ee0f](https://redirect.github.com/swc-project/swc/commit/387ee0f4d864212d38c008f4d3b715b17036fbef))

- **(es/minifier)** Prevent compress.comparisons from transforming expressions with side effects ([#&#8203;11256](https://redirect.github.com/swc-project/swc/issues/11256)) ([58a9d81](https://redirect.github.com/swc-project/swc/commit/58a9d81959162778f6ca1200436c90f3545bd387))

- **(es/minifier)** Remove unused arrow functions in dead code elimination ([#&#8203;11319](https://redirect.github.com/swc-project/swc/issues/11319)) ([88c6ac7](https://redirect.github.com/swc-project/swc/commit/88c6ac7eb05e3367d3d14e40bad8468218576783))

- **(es/parser)** Make the span of Program start at input start ([#&#8203;11199](https://redirect.github.com/swc-project/swc/issues/11199)) ([b56e008](https://redirect.github.com/swc-project/swc/commit/b56e0083c60e9d96fbe7aef9de20ff83d4c77279))

- **(es/plugin)** Use `#[cfg]` to avoid compilation error ([#&#8203;11316](https://redirect.github.com/swc-project/swc/issues/11316)) ([f615cdb](https://redirect.github.com/swc-project/swc/commit/f615cdbc52773b4899fb7831992272088013acc0))

- **(es/quote)** Replace usage of `swc_atoms` with `swc_core::atoms` ([#&#8203;11299](https://redirect.github.com/swc-project/swc/issues/11299)) ([c1e32fa](https://redirect.github.com/swc-project/swc/commit/c1e32fafd3dd8c2424331730c6ebc03bc793b058))

##### Miscellaneous Tasks

- **(es/transformer)** Determine project structure ([#&#8203;11306](https://redirect.github.com/swc-project/swc/issues/11306)) ([58f2602](https://redirect.github.com/swc-project/swc/commit/58f2602981fd5d2efeabc44dc59fbc07dbb4e7cd))

##### Performance

- **(es/compat)** Merge `regexp` pass into `Transformer` ([#&#8203;11307](https://redirect.github.com/swc-project/swc/issues/11307)) ([440b391](https://redirect.github.com/swc-project/swc/commit/440b391e65fab9514c40e65145828c956b8b437b))

- **(es/compat)** Merge `export_namespace_from` to `Transformer` ([#&#8203;11309](https://redirect.github.com/swc-project/swc/issues/11309)) ([7a528ce](https://redirect.github.com/swc-project/swc/commit/7a528ce66ef1a8b715b702de5d246d60a093ab70))

##### Refactor

- **(es/transfomer)** Prevent breaking change ([#&#8203;11308](https://redirect.github.com/swc-project/swc/issues/11308)) ([45827fa](https://redirect.github.com/swc-project/swc/commit/45827fac5d0d0434f425769f6b3f4383617355e0))

### [`v1.15.2`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1152---2025-11-14)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.1...v1.15.2)

##### Bug Fixes

- **(bindings/es)** Respect `filename` option from `print()` ([#&#8203;11264](https://redirect.github.com/swc-project/swc/issues/11264)) ([0d4d2d9](https://redirect.github.com/swc-project/swc/commit/0d4d2d9ab4e912ecf9e17e7c9b49d26b320c1d98))

##### Features

- **(es/minifier)** Drop empty constructors during minification ([#&#8203;11250](https://redirect.github.com/swc-project/swc/issues/11250)) ([2cea7dd](https://redirect.github.com/swc-project/swc/commit/2cea7ddb58390253fed44a4033c71d2333271691))

- **(es/visit)** Add context parameter to VisitMutHook trait ([#&#8203;11254](https://redirect.github.com/swc-project/swc/issues/11254)) ([8645d0d](https://redirect.github.com/swc-project/swc/commit/8645d0de8fcbd61d7a69235ac485debb64497205))

##### Performance

- **(es/parser)** Inline `skip_space` ([afb824a](https://redirect.github.com/swc-project/swc/commit/afb824a97f3d917090e14a8289339ee259f42239))

- **(es/parser)** Eliminate the outer loop of `skip_block_comment` ([#&#8203;11261](https://redirect.github.com/swc-project/swc/issues/11261)) ([e41c0ac](https://redirect.github.com/swc-project/swc/commit/e41c0ac9d5e5e4956f826bceea43f01ad729725e))

- **(es/plugin)** Use shared tokio runtime to avoid creation overhead ([#&#8203;11267](https://redirect.github.com/swc-project/swc/issues/11267)) ([707026b](https://redirect.github.com/swc-project/swc/commit/707026bee1e0d98ec3602ef9d3aac348c7184940))

### [`v1.15.1`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#11511---2026-01-27)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.15.0...v1.15.1)

##### Bug Fixes

- **(es/codegen)** Emit leading comments for JSX elements, fragments, and empty expressions ([#&#8203;11488](https://redirect.github.com/swc-project/swc/issues/11488)) ([1520633](https://redirect.github.com/swc-project/swc/commit/1520633549965eb6838c80d4389431074613bd0e))

- **(es/decorators)** Invoke addInitializer callbacks for decorated fields ([#&#8203;11495](https://redirect.github.com/swc-project/swc/issues/11495)) ([11cfe4d](https://redirect.github.com/swc-project/swc/commit/11cfe4deaea8c66cd1f78e8894b4df11ebdbe0f7))

- **(es/es3)** Visit export decl body even if name is not reserved ([#&#8203;11473](https://redirect.github.com/swc-project/swc/issues/11473)) ([9113fff](https://redirect.github.com/swc-project/swc/commit/9113fffc8cae6d379c5ce7bfd9f5373f6ee9a3aa))

- **(es/es3)** Remove duplicate code ([#&#8203;11499](https://redirect.github.com/swc-project/swc/issues/11499)) ([fbee775](https://redirect.github.com/swc-project/swc/commit/fbee7752443e491ce24b590e00d78677b7e4c8f4))

- **(es/minifier)** Treat new expression with empty class as side-effect free ([#&#8203;11455](https://redirect.github.com/swc-project/swc/issues/11455)) ([a33a45e](https://redirect.github.com/swc-project/swc/commit/a33a45e3bd4e6227d143174198d36f7cbc4b9f2b))

- **(es/minifier)** Escape control characters when converting strings to template literals ([#&#8203;11464](https://redirect.github.com/swc-project/swc/issues/11464)) ([028551f](https://redirect.github.com/swc-project/swc/commit/028551f4f0d00c3880df8af324d3b5eb2637cfb9))

- **(es/minifier)** Handle unused parameters with default values ([#&#8203;11494](https://redirect.github.com/swc-project/swc/issues/11494)) ([6ed1ee9](https://redirect.github.com/swc-project/swc/commit/6ed1ee9ca1e816aedfe0387d240479c1dbfcffef))

- **(es/module)** Preserve ./ prefix for hidden directory imports ([#&#8203;11489](https://redirect.github.com/swc-project/swc/issues/11489)) ([a005391](https://redirect.github.com/swc-project/swc/commit/a0053916e786711be01f73c767e3c2283c9fb4f6))

- **(es/parser)** Validate dynamic import argument count ([#&#8203;11462](https://redirect.github.com/swc-project/swc/issues/11462)) ([2f67591](https://redirect.github.com/swc-project/swc/commit/2f67591e2c9bb41a711d739e6bc81d20a673bfd6))

- **(es/parser)** Allow compilation with --no-default-features ([#&#8203;11460](https://redirect.github.com/swc-project/swc/issues/11460)) ([b70c5f8](https://redirect.github.com/swc-project/swc/commit/b70c5f8ade85c3e4a17e0fed61ce850ab6b1f53c))

- **(es/parser)** Skip emitting TS1102 in TypeScript mode ([#&#8203;11463](https://redirect.github.com/swc-project/swc/issues/11463)) ([e6f5b06](https://redirect.github.com/swc-project/swc/commit/e6f5b06561c1d87d0235aea5cfce9c253afdcc74))

- **(es/parser)** Reject ambiguous generic arrow functions in TSX mode ([#&#8203;11491](https://redirect.github.com/swc-project/swc/issues/11491)) ([ac00915](https://redirect.github.com/swc-project/swc/commit/ac00915ba027bbb2c805ad0abd8d945d7dcf4055))

- **(es/parser)** Disallow NumericLiteralSeparator with BigInts ([#&#8203;11510](https://redirect.github.com/swc-project/swc/issues/11510)) ([6b3644b](https://redirect.github.com/swc-project/swc/commit/6b3644b9ca58530a5e0bb92586bdf8210b89124f))

- **(es/react)** Preserve HTML entity-encoded whitespace in JSX ([#&#8203;11474](https://redirect.github.com/swc-project/swc/issues/11474)) ([7d433a9](https://redirect.github.com/swc-project/swc/commit/7d433a95ccc372535b4f5b9dc691cbd313c2f388))

- **(es/renamer)** Prevent duplicate parameter names with destructuring patterns ([#&#8203;11456](https://redirect.github.com/swc-project/swc/issues/11456)) ([e25a2c8](https://redirect.github.com/swc-project/swc/commit/e25a2c82db0e33c098a8ecd19bb933115e74ac1a))

- **(es/testing)** Skip update when expected output has invalid code ([#&#8203;11469](https://redirect.github.com/swc-project/swc/issues/11469)) ([2be6b8a](https://redirect.github.com/swc-project/swc/commit/2be6b8a1fe3f55c30655f82dcf0cf6c04aa9a331))

- **(es/typescript)** Don't mark enums with opaque members as pure ([#&#8203;11452](https://redirect.github.com/swc-project/swc/issues/11452)) ([b713fae](https://redirect.github.com/swc-project/swc/commit/b713fae8cc1b4fb7a45ffb4bf4a7e9d1facb651f))

- **(preset-env)** Distinguish unknown browser vs empty config ([#&#8203;11457](https://redirect.github.com/swc-project/swc/issues/11457)) ([1310957](https://redirect.github.com/swc-project/swc/commit/1310957bec15ce2352dcb2dde8adb77664625c69))

##### Documentation

- Replace swc.config.js references with .swcrc ([#&#8203;11485](https://redirect.github.com/swc-project/swc/issues/11485)) ([fec8d2c](https://redirect.github.com/swc-project/swc/commit/fec8d2cbb8e7f5eaaed369dd1b45347839fa0c18))

##### Features

- **(cli)** Add --root-mode argument for .swcrc resolution ([#&#8203;11501](https://redirect.github.com/swc-project/swc/issues/11501)) ([b53a0e2](https://redirect.github.com/swc-project/swc/commit/b53a0e2a98a7556c5f8a74270a717e4078793053))

- **(es/module)** Make module transforms optional via `module` feature ([#&#8203;11509](https://redirect.github.com/swc-project/swc/issues/11509)) ([b94a178](https://redirect.github.com/swc-project/swc/commit/b94a17851c9032e0e17c3c9912cfdb60d00722f4))

- **(es/regexp)** Implement unicode property escape transpilation ([#&#8203;11472](https://redirect.github.com/swc-project/swc/issues/11472)) ([a2e0ba0](https://redirect.github.com/swc-project/swc/commit/a2e0ba0151fdde2c11c093d3ab2960410f4ffb86))

- **(es/transformer)** Merge ES3 hooks into swc\_ecma\_transformer ([#&#8203;11503](https://redirect.github.com/swc-project/swc/issues/11503)) ([5efcac9](https://redirect.github.com/swc-project/swc/commit/5efcac946f5cf88e900da2867dc8b92c411bdd18))

##### Miscellaneous Tasks

- **(es/minifier)** Extend OrderedChain to support more node types ([#&#8203;11477](https://redirect.github.com/swc-project/swc/issues/11477)) ([aa9d789](https://redirect.github.com/swc-project/swc/commit/aa9d789953fc8e62e07b91e25137573d3a4d70d7))

##### Performance

- **(bindings)** Optimize string handling by avoiding unnecessary clones ([#&#8203;11490](https://redirect.github.com/swc-project/swc/issues/11490)) ([81daaaa](https://redirect.github.com/swc-project/swc/commit/81daaaa054a579fd2b425c5362b33ffc90471e6f))

- **(es/codegen)** Make `commit_pending_semi` explicit in `write_punct` ([#&#8203;11492](https://redirect.github.com/swc-project/swc/issues/11492)) ([5a27fc0](https://redirect.github.com/swc-project/swc/commit/5a27fc0c49872098339bf897957af5a6b459abf9))

- **(es/es2015)** Port ES2015 transforms to hook-based visitors ([#&#8203;11484](https://redirect.github.com/swc-project/swc/issues/11484)) ([a54eb0e](https://redirect.github.com/swc-project/swc/commit/a54eb0ef7518f759e52636162870f90233ef8532))

- **(es/es3)** Use hooks pattern for single AST traversal ([#&#8203;11483](https://redirect.github.com/swc-project/swc/issues/11483)) ([a139fba](https://redirect.github.com/swc-project/swc/commit/a139fba3b9aca632e02e64333312c989f10e0ef8))

- **(es/minifier)** Use combined AST traversal ([#&#8203;11471](https://redirect.github.com/swc-project/swc/issues/11471)) ([c611663](https://redirect.github.com/swc-project/swc/commit/c611663e9f22293233d5bd8084c3de703dec8b14))

- **(es/transformer)** Add inline hint ([#&#8203;11508](https://redirect.github.com/swc-project/swc/issues/11508)) ([d72c9df](https://redirect.github.com/swc-project/swc/commit/d72c9df7e390389c3f9a2645341f920c5d42d0db))

##### Refactor

- **(es/compat)** Put ES3 crates behind feature flag ([#&#8203;11480](https://redirect.github.com/swc-project/swc/issues/11480)) ([d5a8d84](https://redirect.github.com/swc-project/swc/commit/d5a8d8447a6a4517372a5d52151e6732d74a1ade))

##### Testing

- **(es/minifier)** Add test case for `merge_imports` order preservation ([#&#8203;11458](https://redirect.github.com/swc-project/swc/issues/11458)) ([b874a05](https://redirect.github.com/swc-project/swc/commit/b874a05d5cde160c4d40f0d73f871fdb1746a753))

- **(es/parser)** Add error tests for import.source and import.defer with too many args ([#&#8203;11466](https://redirect.github.com/swc-project/swc/issues/11466)) ([7313462](https://redirect.github.com/swc-project/swc/commit/731346282ebdb11fd3a1fb6b558cc83982e4afcb))

- **(es/parser)** Check `handler.has_errors()` in test error parsing ([#&#8203;11487](https://redirect.github.com/swc-project/swc/issues/11487)) ([fade647](https://redirect.github.com/swc-project/swc/commit/fade647452ed288d42336a4c5580b49bd4953e23))

- Replace deprecated `cargo_bin` function with `cargo_bin!` macro ([#&#8203;11461](https://redirect.github.com/swc-project/swc/issues/11461)) ([73f77b6](https://redirect.github.com/swc-project/swc/commit/73f77b6331b1501592315b78babcc96d9ae9b483))

### [`v1.15.0`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1150---2025-11-04)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.14.0...v1.15.0)

##### Bug Fixes

- **(cli)** Update plugin template to use VisitMut API ([#&#8203;11218](https://redirect.github.com/swc-project/swc/issues/11218)) ([6a87e41](https://redirect.github.com/swc-project/swc/commit/6a87e41fbaf2f97e2f530d8560df7bb9e0ba1a12))

- **(hstr)** Skip only `\u` for unicode ([#&#8203;11216](https://redirect.github.com/swc-project/swc/issues/11216)) ([eda01e5](https://redirect.github.com/swc-project/swc/commit/eda01e5284ad5b1eda538eda7231795d75f7136f))

##### Features

- **(hstr)** Support checked `from_bytes` for Wtf8Buf and Wtf8 ([#&#8203;11211](https://redirect.github.com/swc-project/swc/issues/11211)) ([1430489](https://redirect.github.com/swc-project/swc/commit/1430489460a54598300427bfc7ed0f4a30bf8d63))

##### Performance

- **(atoms)** Remove temporary allocations in rkyv serialize and deserialize ([#&#8203;11202](https://redirect.github.com/swc-project/swc/issues/11202)) ([85e6e8a](https://redirect.github.com/swc-project/swc/commit/85e6e8a66f0e517512d7cd13c5b287b1ef82e191))

- **(es/parser)** Remove `start` in `State` ([#&#8203;11201](https://redirect.github.com/swc-project/swc/issues/11201)) ([b9aeaa3](https://redirect.github.com/swc-project/swc/commit/b9aeaa3a3bab072f90fb8f26454cb33062bff584))

- **(plugin)** Avoid data copy when transformation finished ([#&#8203;11223](https://redirect.github.com/swc-project/swc/issues/11223)) ([af134fa](https://redirect.github.com/swc-project/swc/commit/af134faecd5979126165a5462abf880c70b5b54b))

##### Refactor

- **(ast)** Introduce flexible serialization encoding for AST ([#&#8203;11100](https://redirect.github.com/swc-project/swc/issues/11100)) ([8ad3647](https://redirect.github.com/swc-project/swc/commit/8ad36478160ff848466bbff2bf442224696982bf))

- **(plugin)** Switch plugin abi to flexible serialization ([#&#8203;11198](https://redirect.github.com/swc-project/swc/issues/11198)) ([e5feaf1](https://redirect.github.com/swc-project/swc/commit/e5feaf15cebb2887cd8dc9d0275c4ec0fbf40d30))

- Flatten cargo workspaces ([#&#8203;11213](https://redirect.github.com/swc-project/swc/issues/11213)) ([6223100](https://redirect.github.com/swc-project/swc/commit/622310055c59ee42b744038a33997e6f43cf4af0))

##### Testing

- Copy opt-level configs to the top level workspace ([#&#8203;11210](https://redirect.github.com/swc-project/swc/issues/11210)) ([dba23f5](https://redirect.github.com/swc-project/swc/commit/dba23f5a72d26b3b62fbafe2d8a65c69c3642669))

### [`v1.14.0`](https://redirect.github.com/swc-project/swc/blob/HEAD/CHANGELOG.md#1140---2025-10-29)

[Compare Source](https://redirect.github.com/swc-project/swc/compare/v1.13.21...v1.14.0)

##### Bug Fixes

- **(atoms)** Fix broken quote macro ([#&#8203;11195](https://redirect.github.com/swc-project/swc/issues/11195)) ([3485179](https://redirect.github.com/swc-project/swc/commit/3485179196c056b913cdc7507ed5f3bb282623ee))

- **(es/ast)** Fix unicode unpaired surrogates handling ([#&#8203;11144](https://redirect.github.com/swc-project/swc/issues/11144)) ([845512c](https://redirect.github.com/swc-project/swc/commit/845512c67819cd37bb25601d34bd5b1ac79afca3))

- **(hstr)** Fix unsoundness of `wtf8`'s transmutation ([#&#8203;11194](https://redirect.github.com/swc-project/swc/issues/11194)) ([f27e65b](https://redirect.github.com/swc-project/swc/commit/f27e65b94b517204944505a3c0e11b6033407594))

##### Features

- **(es/compiler)** Merge `nullish_coalescing` into `Compiler` ([#&#8203;11157](https://redirect.github.com/swc-project/swc/issues/11157)) ([dd6f71b](https://redirect.github.com/swc-project/swc/commit/dd6f71b92fecd0137af3cf16d72799afc3ce30d6))

##### Miscellaneous Tasks

- **(binding\_macros)** Add `default-features = false` ([#&#8203;11193](https://redirect.github.com/swc-project/swc/issues/11193)) ([85d855f](https://redirect.github.com/swc-project/swc/commit/85d855fd0478f989bac5d62caad668497f497137))

##### Performance

- **(es/parser)** Remove `had_line_break_before_last` (

</details>

---

#### chore(deps): update dependency typescript to v5.9.3 ([#109](https://github.com/grafana/scenes-ml/pull/109))

<details>
<summary>microsoft/TypeScript (typescript)</summary>

#### chore(deps): update testing-library monorepo ([#112](https://github.com/grafana/scenes-ml/pull/112))

<details>
<summary>testing-library/jest-dom (@&#8203;testing-library/jest-dom)</summary>

#### chore(deps): update yarn to v4.12.0 ([#113](https://github.com/grafana/scenes-ml/pull/113))

<details>
<summary>yarnpkg/berry (yarn)</summary>

#### chore(deps): update dependency esbuild to ^0.27.2 ([#105](https://github.com/grafana/scenes-ml/pull/105))

<details>
<summary>evanw/esbuild (esbuild)</summary>

### [`v0.27.4`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0274)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.3...v0.27.4)

- Fix a regression with CSS media queries ([#&#8203;4395](https://redirect.github.com/evanw/esbuild/issues/4395), [#&#8203;4405](https://redirect.github.com/evanw/esbuild/issues/4405), [#&#8203;4406](https://redirect.github.com/evanw/esbuild/issues/4406))

  Version 0.25.11 of esbuild introduced support for parsing media queries. This unintentionally introduced a regression with printing media queries that use the `<media-type> and <media-condition-without-or>` grammar. Specifically, esbuild was failing to wrap an `or` clause with parentheses when inside `<media-condition-without-or>`. This release fixes the regression.

  Here is an example:

  ```css
  /* Original code */
  @&#8203;media only screen and ((min-width: 10px) or (min-height: 10px)) {
    a { color: red }
  }

  /* Old output (incorrect) */
  @&#8203;media only screen and (min-width: 10px) or (min-height: 10px) {
    a {
      color: red;
    }
  }

  /* New output (correct) */
  @&#8203;media only screen and ((min-width: 10px) or (min-height: 10px)) {
    a {
      color: red;
    }
  }
  ```

- Fix an edge case with the `inject` feature ([#&#8203;4407](https://redirect.github.com/evanw/esbuild/issues/4407))

  This release fixes an edge case where esbuild's `inject` feature could not be used with arbitrary module namespace names exported using an `export {} from` statement with bundling disabled and a target environment where arbitrary module namespace names is unsupported.

  With the fix, the following `inject` file:

  ```js
  import jquery from 'jquery';
  export { jquery as 'window.jQuery' };
  ```

  Can now always be rewritten as this without esbuild sometimes incorrectly generating an error:

  ```js
  export { default as 'window.jQuery' } from 'jquery';
  ```

- Attempt to improve API handling of huge metafiles ([#&#8203;4329](https://redirect.github.com/evanw/esbuild/issues/4329), [#&#8203;4415](https://redirect.github.com/evanw/esbuild/issues/4415))

  This release contains a few changes that attempt to improve the behavior of esbuild's JavaScript API with huge metafiles (esbuild's name for the build metadata, formatted as a JSON object). The JavaScript API is designed to return the metafile JSON as a JavaScript object in memory, which makes it easy to access from within a JavaScript-based plugin. Multiple people have encountered issues where this API breaks down with a pathologically-large metafile.

  The primary issue is that V8 has an implementation-specific maximum string length, so using the `JSON.parse` API with large enough strings is impossible. This release will now attempt to use a fallback JavaScript-based JSON parser that operates directly on the UTF8-encoded JSON bytes instead of using `JSON.parse` when the JSON metafile is too big to fit in a JavaScript string. The new fallback path has not yet been heavily-tested. The metafile will also now be generated with whitespace removed if the bundle is significantly large, which will reduce the size of the metafile JSON slightly.

  However, hitting this case is potentially a sign that something else is wrong. Ideally you wouldn't be building something so enormous that the build metadata can't even fit inside a JavaScript string. You may want to consider optimizing your project, or breaking up your project into multiple parts that are built independently. Another option could potentially be to use esbuild's command-line API instead of its JavaScript API, which is more efficient (although of course then you can't use JavaScript plugins, so it may not be an option).

### [`v0.27.3`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0273)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.2...v0.27.3)

- Preserve URL fragments in data URLs ([#&#8203;4370](https://redirect.github.com/evanw/esbuild/issues/4370))

  Consider the following HTML, CSS, and SVG:

  - `index.html`:

    ```html
    <!DOCTYPE html>
    <html>
      <head><link rel="stylesheet" href="icons.css"></head>
      <body><div class="triangle"></div></body>
    </html>
    ```

  - `icons.css`:

    ```css
    .triangle {
      width: 10px;
      height: 10px;
      background: currentColor;
      clip-path: url(./triangle.svg#x);
    }
    ```

  - `triangle.svg`:

    ```xml
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="x">
          <path d="M0 0H10V10Z"/>
        </clipPath>
      </defs>
    </svg>
    ```

  The CSS uses a URL fragment (the `#x`) to reference the `clipPath` element in the SVG file. Previously esbuild's CSS bundler didn't preserve the URL fragment when bundling the SVG using the `dataurl` loader, which broke the bundled CSS. With this release, esbuild will now preserve the URL fragment in the bundled CSS:

  ```css
  /* icons.css */
  .triangle {
    width: 10px;
    height: 10px;
    background: currentColor;
    clip-path: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="x"><path d="M0 0H10V10Z"/></clipPath></defs></svg>#x');
  }
  ```

- Parse and print CSS `@scope` rules ([#&#8203;4322](https://redirect.github.com/evanw/esbuild/issues/4322))

  This release includes dedicated support for parsing `@scope` rules in CSS. These rules include optional "start" and "end" selector lists. One important consequence of this is that the local/global status of names in selector lists is now respected, which improves the correctness of esbuild's support for [CSS modules](https://esbuild.github.io/content-types/#local-css). Minification of selectors inside `@scope` rules has also improved slightly.

  Here's an example:

  ```css
  /* Original code */
  @&#8203;scope (:global(.foo)) to (:local(.bar)) {
    .bar {
      color: red;
    }
  }

  /* Old output (with --loader=local-css --minify) */
  @&#8203;scope (:global(.foo)) to (:local(.bar)){.o{color:red}}

  /* New output (with --loader=local-css --minify) */
  @&#8203;scope(.foo)to (.o){.o{color:red}}
  ```

- Fix a minification bug with lowering of `for await` ([#&#8203;4378](https://redirect.github.com/evanw/esbuild/pull/4378), [#&#8203;4385](https://redirect.github.com/evanw/esbuild/pull/4385))

  This release fixes a bug where the minifier would incorrectly strip the variable in the automatically-generated `catch` clause of lowered `for await` loops. The code that generated the loop previously failed to mark the internal variable references as used.

- Update the Go compiler from v1.25.5 to v1.25.7 ([#&#8203;4383](https://redirect.github.com/evanw/esbuild/issues/4383), [#&#8203;4388](https://redirect.github.com/evanw/esbuild/pull/4388))

  This PR was contributed by [@&#8203;MikeWillCook](https://redirect.github.com/MikeWillCook).

</details>

---

#### chore(deps): update dependency ts-jest to v29.4.6 ([#108](https://github.com/grafana/scenes-ml/pull/108))

<details>
<summary>kulshekhar/ts-jest (ts-jest)</summary>

### [`v29.4.6`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2946-2025-12-01)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.5...v29.4.6)

##### Bug Fixes

- log hybrid module as warning instead of failing tests ([#&#8203;5144](https://redirect.github.com/kulshekhar/ts-jest/issues/5144)) ([528d37c](https://redirect.github.com/kulshekhar/ts-jest/commit/528d37c125a392a4a6e44a1bf399943410298390)), closes [#&#8203;5130](https://redirect.github.com/kulshekhar/ts-jest/issues/5130)

### [`v29.4.5`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2945-2025-10-10)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.4...v29.4.5)

##### Bug Fixes

- allow filtering modern module warning message with diagnostic code ([c290d4d](https://redirect.github.com/kulshekhar/ts-jest/commit/c290d4d7f68b47bc4f31b26f241b93ef667dcb72)), , closes [#&#8203;5013](https://redirect.github.com/kulshekhar/ts-jest/issues/5013)

### [`v29.4.4`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2944-2025-09-19)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.3...v29.4.4)

##### Bug Fixes

- revert **29.4.3** changes ([25cb706](https://redirect.github.com/kulshekhar/ts-jest/commit/25cb7065528f7a43b6c6ee5bb33fc3f940932ccd)), closes [#&#8203;5049](https://redirect.github.com/kulshekhar/ts-jest/issues/5049)

### [`v29.4.3`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2944-2025-09-19)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.2...v29.4.3)

##### Bug Fixes

- revert **29.4.3** changes ([25cb706](https://redirect.github.com/kulshekhar/ts-jest/commit/25cb7065528f7a43b6c6ee5bb33fc3f940932ccd)), closes [#&#8203;5049](https://redirect.github.com/kulshekhar/ts-jest/issues/5049)

### [`v29.4.2`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2942-2025-09-15)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.1...v29.4.2)

### [`v29.4.1`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2941-2025-08-03)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.4.0...v29.4.1)

### [`v29.4.0`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2940-2025-06-11)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.3.4...v29.4.0)

##### Features

- feat: support Jest 30 ([84e093e](https://redirect.github.com/kulshekhar/ts-jest/commit/84e093e))

### [`v29.3.4`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2934-2025-05-16)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.3.3...v29.3.4)

##### Bug Fixes

- fix: fix `TsJestTransformerOptions` type ([3b11e29](https://redirect.github.com/kulshekhar/ts-jest/commit/3b11e29)), closes [#&#8203;4247](https://redirect.github.com/kulshekhar/ts-jest/issues/4247)
- fix(cli): fix wrong path for preset creator fns ([249eb2c](https://redirect.github.com/kulshekhar/ts-jest/commit/249eb2c))
- fix(config): disable `rewriteRelativeImportExtensions` always ([9b1f472](https://redirect.github.com/kulshekhar/ts-jest/commit/9b1f472)), closes [#&#8203;4855](https://redirect.github.com/kulshekhar/ts-jest/issues/4855)

### [`v29.3.3`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2933-2025-05-14)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.3.2...v29.3.3)

##### Bug Fixes

- fix(cli): init config with preset creator functions ([cdd3039](https://redirect.github.com/kulshekhar/ts-jest/commit/cdd3039)), closes [#&#8203;4840](https://redirect.github.com/kulshekhar/ts-jest/issues/4840)
- fix(config): disable `isolatedDeclarations` ([5d6b35f](https://redirect.github.com/kulshekhar/ts-jest/commit/5d6b35f)), closes [#&#8203;4847](https://redirect.github.com/kulshekhar/ts-jest/issues/4847)

### [`v29.3.2`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2932-2025-04-12)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.3.1...v29.3.2)

##### Bug Fixes

- fix: transpile `js` files from `node_modules` whenever Jest asks ([968370e](https://redirect.github.com/kulshekhar/ts-jest/commit/968370e)), closes [#&#8203;4637](https://redirect.github.com/kulshekhar/ts-jest/issues/4637)

### [`v29.3.1`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2931-2025-03-31)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.3.0...v29.3.1)

##### Bug Fixes

- fix: allow `isolatedModules` mode to have `ts.Program` under `Node16/Next` ([25157eb](https://redirect.github.com/kulshekhar/ts-jest/commit/25157eb))
- fix: improve message for `isolatedModules` of `ts-jest` config ([547eb6f](https://redirect.github.com/kulshekhar/ts-jest/commit/547eb6f))

### [`v29.3.0`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2930-2025-03-21)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.2.6...v29.3.0)

##### Features

- feat: support hybrid `module` values for `isolatedModules: true` ([f372121](https://redirect.github.com/kulshekhar/ts-jest/commit/f372121))

##### Bug Fixes

- fix: set `customConditions` to `undefined` in `TsCompiler` ([b091d70](https://redirect.github.com/kulshekhar/ts-jest/commit/b091d70)), closes [#&#8203;4620](https://redirect.github.com/kulshekhar/ts-jest/issues/4620)

##### Code Refactoring

- refactor: remove manual version checker ([89458fc](https://redirect.github.com/kulshekhar/ts-jest/commit/89458fc))
- refactor: remove patching deps based on version checker ([bac4c43](https://redirect.github.com/kulshekhar/ts-jest/commit/bac4c43))
- refactor: deprecate `RawCompilerOptions` interface ([2b1b6cd](https://redirect.github.com/kulshekhar/ts-jest/commit/2b1b6cd))
- refactor: deprecate transform option `isolatedModules` ([7dfef71](https://redirect.github.com/kulshekhar/ts-jest/commit/7dfef71))

### [`v29.2.6`](https://redirect.github.com/kulshekhar/ts-jest/blob/HEAD/CHANGELOG.md#2926-2025-02-22)

[Compare Source](https://redirect.github.com/kulshekhar/ts-jest/compare/v29.2.5...v29.2.6)

##### Bug Fixes

- fix: escape dot for `JS_TRANSFORM_PATTERN` regex ([8c91c60](https://redirect.github.com/kulshekhar/ts-jest/commit/8c91c60))
- fix: escape dot for `TS_JS_TRANSFORM_PATTERN` regex ([3eea850](https://redirect.github.com/kulshekhar/ts-jest/commit/3eea850))
- fix: escape dot for `TS_TRANSFORM_PATTERN` regex ([80d3e4d](https://redirect.github.com/kulshekhar/ts-jest/commit/80d3e4d)), closes [#&#8203;4579](https://redirect.github.com/kulshekhar/ts-jest/issues/4579)

</details>

---

#### fix(deps): update dependency rxjs to v7.8.2 ([#84](https://github.com/grafana/scenes-ml/pull/84))

<details>
<summary>reactivex/rxjs (rxjs)</summary>

#### chore(deps): update dependency esbuild to ^0.27.0 ([#94](https://github.com/grafana/scenes-ml/pull/94))

<details>
<summary>evanw/esbuild (esbuild)</summary>

### [`v0.27.4`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0274)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.3...v0.27.4)

- Fix a regression with CSS media queries ([#&#8203;4395](https://redirect.github.com/evanw/esbuild/issues/4395), [#&#8203;4405](https://redirect.github.com/evanw/esbuild/issues/4405), [#&#8203;4406](https://redirect.github.com/evanw/esbuild/issues/4406))

  Version 0.25.11 of esbuild introduced support for parsing media queries. This unintentionally introduced a regression with printing media queries that use the `<media-type> and <media-condition-without-or>` grammar. Specifically, esbuild was failing to wrap an `or` clause with parentheses when inside `<media-condition-without-or>`. This release fixes the regression.

  Here is an example:

  ```css
  /* Original code */
  @&#8203;media only screen and ((min-width: 10px) or (min-height: 10px)) {
    a { color: red }
  }

  /* Old output (incorrect) */
  @&#8203;media only screen and (min-width: 10px) or (min-height: 10px) {
    a {
      color: red;
    }
  }

  /* New output (correct) */
  @&#8203;media only screen and ((min-width: 10px) or (min-height: 10px)) {
    a {
      color: red;
    }
  }
  ```

- Fix an edge case with the `inject` feature ([#&#8203;4407](https://redirect.github.com/evanw/esbuild/issues/4407))

  This release fixes an edge case where esbuild's `inject` feature could not be used with arbitrary module namespace names exported using an `export {} from` statement with bundling disabled and a target environment where arbitrary module namespace names is unsupported.

  With the fix, the following `inject` file:

  ```js
  import jquery from 'jquery';
  export { jquery as 'window.jQuery' };
  ```

  Can now always be rewritten as this without esbuild sometimes incorrectly generating an error:

  ```js
  export { default as 'window.jQuery' } from 'jquery';
  ```

- Attempt to improve API handling of huge metafiles ([#&#8203;4329](https://redirect.github.com/evanw/esbuild/issues/4329), [#&#8203;4415](https://redirect.github.com/evanw/esbuild/issues/4415))

  This release contains a few changes that attempt to improve the behavior of esbuild's JavaScript API with huge metafiles (esbuild's name for the build metadata, formatted as a JSON object). The JavaScript API is designed to return the metafile JSON as a JavaScript object in memory, which makes it easy to access from within a JavaScript-based plugin. Multiple people have encountered issues where this API breaks down with a pathologically-large metafile.

  The primary issue is that V8 has an implementation-specific maximum string length, so using the `JSON.parse` API with large enough strings is impossible. This release will now attempt to use a fallback JavaScript-based JSON parser that operates directly on the UTF8-encoded JSON bytes instead of using `JSON.parse` when the JSON metafile is too big to fit in a JavaScript string. The new fallback path has not yet been heavily-tested. The metafile will also now be generated with whitespace removed if the bundle is significantly large, which will reduce the size of the metafile JSON slightly.

  However, hitting this case is potentially a sign that something else is wrong. Ideally you wouldn't be building something so enormous that the build metadata can't even fit inside a JavaScript string. You may want to consider optimizing your project, or breaking up your project into multiple parts that are built independently. Another option could potentially be to use esbuild's command-line API instead of its JavaScript API, which is more efficient (although of course then you can't use JavaScript plugins, so it may not be an option).

### [`v0.27.3`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0273)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.2...v0.27.3)

- Preserve URL fragments in data URLs ([#&#8203;4370](https://redirect.github.com/evanw/esbuild/issues/4370))

  Consider the following HTML, CSS, and SVG:

  - `index.html`:

    ```html
    <!DOCTYPE html>
    <html>
      <head><link rel="stylesheet" href="icons.css"></head>
      <body><div class="triangle"></div></body>
    </html>
    ```

  - `icons.css`:

    ```css
    .triangle {
      width: 10px;
      height: 10px;
      background: currentColor;
      clip-path: url(./triangle.svg#x);
    }
    ```

  - `triangle.svg`:

    ```xml
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="x">
          <path d="M0 0H10V10Z"/>
        </clipPath>
      </defs>
    </svg>
    ```

  The CSS uses a URL fragment (the `#x`) to reference the `clipPath` element in the SVG file. Previously esbuild's CSS bundler didn't preserve the URL fragment when bundling the SVG using the `dataurl` loader, which broke the bundled CSS. With this release, esbuild will now preserve the URL fragment in the bundled CSS:

  ```css
  /* icons.css */
  .triangle {
    width: 10px;
    height: 10px;
    background: currentColor;
    clip-path: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><defs><clipPath id="x"><path d="M0 0H10V10Z"/></clipPath></defs></svg>#x');
  }
  ```

- Parse and print CSS `@scope` rules ([#&#8203;4322](https://redirect.github.com/evanw/esbuild/issues/4322))

  This release includes dedicated support for parsing `@scope` rules in CSS. These rules include optional "start" and "end" selector lists. One important consequence of this is that the local/global status of names in selector lists is now respected, which improves the correctness of esbuild's support for [CSS modules](https://esbuild.github.io/content-types/#local-css). Minification of selectors inside `@scope` rules has also improved slightly.

  Here's an example:

  ```css
  /* Original code */
  @&#8203;scope (:global(.foo)) to (:local(.bar)) {
    .bar {
      color: red;
    }
  }

  /* Old output (with --loader=local-css --minify) */
  @&#8203;scope (:global(.foo)) to (:local(.bar)){.o{color:red}}

  /* New output (with --loader=local-css --minify) */
  @&#8203;scope(.foo)to (.o){.o{color:red}}
  ```

- Fix a minification bug with lowering of `for await` ([#&#8203;4378](https://redirect.github.com/evanw/esbuild/pull/4378), [#&#8203;4385](https://redirect.github.com/evanw/esbuild/pull/4385))

  This release fixes a bug where the minifier would incorrectly strip the variable in the automatically-generated `catch` clause of lowered `for await` loops. The code that generated the loop previously failed to mark the internal variable references as used.

- Update the Go compiler from v1.25.5 to v1.25.7 ([#&#8203;4383](https://redirect.github.com/evanw/esbuild/issues/4383), [#&#8203;4388](https://redirect.github.com/evanw/esbuild/pull/4388))

  This PR was contributed by [@&#8203;MikeWillCook](https://redirect.github.com/MikeWillCook).

### [`v0.27.2`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0272)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.1...v0.27.2)

- Allow import path specifiers starting with `#/` ([#&#8203;4361](https://redirect.github.com/evanw/esbuild/pull/4361))

  Previously the specification for `package.json` disallowed import path specifiers starting with `#/`, but this restriction [has recently been relaxed](https://redirect.github.com/nodejs/node/pull/60864) and support for it is being added across the JavaScript ecosystem. One use case is using it for a wildcard pattern such as mapping `#/*` to `./src/*` (previously you had to use another character such as `#_*` instead, which was more confusing). There is some more context in [nodejs/node#49182](https://redirect.github.com/nodejs/node/issues/49182).

  This change was contributed by [@&#8203;hybrist](https://redirect.github.com/hybrist).

- Automatically add the `-webkit-mask` prefix ([#&#8203;4357](https://redirect.github.com/evanw/esbuild/issues/4357), [#&#8203;4358](https://redirect.github.com/evanw/esbuild/issues/4358))

  This release automatically adds the `-webkit-` vendor prefix for the [`mask`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/mask) CSS shorthand property:

  ```css
  /* Original code */
  main {
    mask: url(x.png) center/5rem no-repeat
  }

  /* Old output (with --target=chrome110) */
  main {
    mask: url(x.png) center/5rem no-repeat;
  }

  /* New output (with --target=chrome110) */
  main {
    -webkit-mask: url(x.png) center/5rem no-repeat;
    mask: url(x.png) center/5rem no-repeat;
  }
  ```

  This change was contributed by [@&#8203;BPJEnnova](https://redirect.github.com/BPJEnnova).

- Additional minification of `switch` statements ([#&#8203;4176](https://redirect.github.com/evanw/esbuild/issues/4176), [#&#8203;4359](https://redirect.github.com/evanw/esbuild/issues/4359))

  This release contains additional minification patterns for reducing `switch` statements. Here is an example:

  ```js
  // Original code
  switch (x) {
    case 0:
      foo()
      break
    case 1:
    default:
      bar()
  }

  // Old output (with --minify)
  switch(x){case 0:foo();break;case 1:default:bar()}

  // New output (with --minify)
  x===0?foo():bar();
  ```

- Forbid `using` declarations inside `switch` clauses ([#&#8203;4323](https://redirect.github.com/evanw/esbuild/issues/4323))

  This is a rare change to remove something that was previously possible. The [Explicit Resource Management](https://redirect.github.com/tc39/proposal-explicit-resource-management) proposal introduced `using` declarations. These were previously allowed inside `case` and `default` clauses in `switch` statements. This had well-defined semantics and was already widely implemented (by V8, SpiderMonkey, TypeScript, esbuild, and others). However, it was considered to be too confusing because of how scope works in switch statements, so it has been removed from the specification. This edge case will now be a syntax error. See [tc39/proposal-explicit-resource-management#215](https://redirect.github.com/tc39/proposal-explicit-resource-management/issues/215) and [rbuckton/ecma262#14](https://redirect.github.com/rbuckton/ecma262/pull/14) for details.

  Here is an example of code that is no longer allowed:

  ```js
  switch (mode) {
    case 'read':
      using readLock = db.read()
      return readAll(readLock)

    case 'write':
      using writeLock = db.write()
      return writeAll(writeLock)
  }
  ```

  That code will now have to be modified to look like this instead (note the additional `{` and `}` block statements around each case body):

  ```js
  switch (mode) {
    case 'read': {
      using readLock = db.read()
      return readAll(readLock)
    }
    case 'write': {
      using writeLock = db.write()
      return writeAll(writeLock)
    }
  }
  ```

  This is not being released in one of esbuild's breaking change releases since this feature hasn't been finalized yet, and esbuild always tracks the current state of the specification (so esbuild's previous behavior was arguably incorrect).

### [`v0.27.1`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0271)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.27.0...v0.27.1)

- Fix bundler bug with `var` nested inside `if` ([#&#8203;4348](https://redirect.github.com/evanw/esbuild/issues/4348))

  This release fixes a bug with the bundler that happens when importing an ES module using `require` (which causes it to be wrapped) and there's a top-level `var` inside an `if` statement without being wrapped in a `{ ... }` block (and a few other conditions). The bundling transform needed to hoist these `var` declarations outside of the lazy ES module wrapper for correctness. See the issue for details.

- Fix minifier bug with `for` inside `try` inside label ([#&#8203;4351](https://redirect.github.com/evanw/esbuild/issues/4351))

  This fixes an old regression from [version v0.21.4](https://redirect.github.com/evanw/esbuild/releases/v0.21.4). Some code was introduced to move the label inside the `try` statement to address a problem with transforming labeled `for await` loops to avoid the `await` (the transformation involves converting the `for await` loop into a `for` loop and wrapping it in a `try` statement). However, it introduces problems for cross-compiled JVM code that uses all three of these features heavily. This release restricts this transform to only apply to `for` loops that esbuild itself generates internally as part of the `for await` transform. Here is an example of some affected code:

  ```js
  // Original code
  d: {
    e: {
      try {
        while (1) { break d }
      } catch { break e; }
    }
  }

  // Old output (with --minify)
  a:try{e:for(;;)break a}catch{break e}

  // New output (with --minify)
  a:e:try{for(;;)break a}catch{break e}
  ```

- Inline IIFEs containing a single expression ([#&#8203;4354](https://redirect.github.com/evanw/esbuild/issues/4354))

  Previously inlining of IIFEs (immediately-invoked function expressions) only worked if the body contained a single `return` statement. Now it should also work if the body contains a single expression statement instead:

  ```js
  // Original code
  const foo = () => {
    const cb = () => {
      console.log(x())
    }
    return cb()
  }

  // Old output (with --minify)
  const foo=()=>(()=>{console.log(x())})();

  // New output (with --minify)
  const foo=()=>{console.log(x())};
  ```

- The minifier now strips empty `finally` clauses ([#&#8203;4353](https://redirect.github.com/evanw/esbuild/issues/4353))

  This improvement means that `finally` clauses containing dead code can potentially cause the associated `try` statement to be removed from the output entirely in minified builds:

  ```js
  // Original code
  function foo(callback) {
    if (DEBUG) stack.push(callback.name);
    try {
      callback();
    } finally {
      if (DEBUG) stack.pop();
    }
  }

  // Old output (with --minify --define:DEBUG=false)
  function foo(a){try{a()}finally{}}

  // New output (with --minify --define:DEBUG=false)
  function foo(a){a()}
  ```

- Allow tree-shaking of the `Symbol` constructor

  With this release, calling `Symbol` is now considered to be side-effect free when the argument is known to be a primitive value. This means esbuild can now tree-shake module-level symbol variables:

  ```js
  // Original code
  const a = Symbol('foo')
  const b = Symbol(bar)

  // Old output (with --tree-shaking=true)
  const a = Symbol("foo");
  const b = Symbol(bar);

  // New output (with --tree-shaking=true)
  const b = Symbol(bar);
  ```

### [`v0.27.0`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0270)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.26.0...v0.27.0)

**This release deliberately contains backwards-incompatible changes.** To avoid automatically picking up releases like this, you should either be pinning the exact version of `esbuild` in your `package.json` file (recommended) or be using a version range syntax that only accepts patch upgrades such as `^0.26.0` or `~0.26.0`. See npm's documentation about [semver](https://docs.npmjs.com/cli/v6/using-npm/semver/) for more information.

- Use `Uint8Array.fromBase64` if available ([#&#8203;4286](https://redirect.github.com/evanw/esbuild/issues/4286))

  With this release, esbuild's `binary` loader will now use the new [`Uint8Array.fromBase64`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64) function unless it's unavailable in the configured target environment. If it's unavailable, esbuild's previous code for this will be used as a fallback. Note that this means you may now need to specify `target` when using this feature with Node (for example `--target=node22`) unless you're using Node v25+.

- Update the Go compiler from v1.23.12 to v1.25.4 ([#&#8203;4208](https://redirect.github.com/evanw/esbuild/issues/4208), [#&#8203;4311](https://redirect.github.com/evanw/esbuild/pull/4311))

  This raises the operating system requirements for running esbuild:

  - Linux: now requires a kernel version of 3.2 or later
  - macOS: now requires macOS 12 (Monterey) or later

### [`v0.26.0`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0260)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.25.12...v0.26.0)

- Enable trusted publishing ([#&#8203;4281](https://redirect.github.com/evanw/esbuild/issues/4281))

  GitHub and npm are recommending that maintainers for packages such as esbuild switch to [trusted publishing](https://docs.npmjs.com/trusted-publishers). With this release, a VM on GitHub will now build and publish all of esbuild's packages to npm instead of me. In theory.

  Unfortunately there isn't really a way to test that this works other than to do it live. So this release is that live test. Hopefully this release is uneventful and is exactly the same as the previous one (well, except for the green provenance attestation checkmark on npm that happens with trusted publishing).

### [`v0.25.12`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#02512)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.25.11...v0.25.12)

- Fix a minification regression with CSS media queries ([#&#8203;4315](https://redirect.github.com/evanw/esbuild/issues/4315))

  The previous release introduced support for parsing media queries which unintentionally introduced a regression with the removal of duplicate media rules during minification. Specifically the grammar for `@media <media-type> and <media-condition-without-or> { ... }` was missing an equality check for the `<media-condition-without-or>` part, so rules with different suffix clauses in this position would incorrectly compare equal and be deduplicated. This release fixes the regression.

- Update the list of known JavaScript globals ([#&#8203;4310](https://redirect.github.com/evanw/esbuild/issues/4310))

  This release updates esbuild's internal list of known JavaScript globals. These are globals that are known to not have side-effects when the property is accessed. For example, accessing the global `Array` property is considered to be side-effect free but accessing the global `scrollY` property can trigger a layout, which is a side-effect. This is used by esbuild's tree-shaking to safely remove unused code that is known to be side-effect free. This update adds the following global properties:

  From [ES2017](https://tc39.es/ecma262/2017/):

  - `Atomics`
  - `SharedArrayBuffer`

  From [ES2020](https://tc39.es/ecma262/2020/):

  - `BigInt64Array`
  - `BigUint64Array`

  From [ES2021](https://tc39.es/ecma262/2021/):

  - `FinalizationRegistry`
  - `WeakRef`

  From [ES2025](https://tc39.es/ecma262/2025/):

  - `Float16Array`
  - `Iterator`

  Note that this does not indicate that constructing any of these objects is side-effect free, just that accessing the identifier is side-effect free. For example, this now allows esbuild to tree-shake classes that extend from `Iterator`:

  ```js
  // This can now be tree-shaken by esbuild:
  class ExampleIterator extends Iterator {}
  ```

- Add support for the new `@view-transition` CSS rule ([#&#8203;4313](https://redirect.github.com/evanw/esbuild/pull/4313))

  With this release, esbuild now has improved support for pretty-printing and minifying the new `@view-transition` rule (which esbuild was previously unaware of):

  ```css
  /* Original code */
  @&#8203;view-transition {
    navigation: auto;
    types: check;
  }

  /* Old output */
  @&#8203;view-transition { navigation: auto; types: check; }

  /* New output */
  @&#8203;view-transition {
    navigation: auto;
    types: check;
  }
  ```

  The new view transition feature provides a mechanism for creating animated transitions between documents in a multi-page app. You can read more about view transition rules [here](https://developer.mozilla.org/en-US/docs/Web/CSS/@&#8203;view-transition).

  This change was contributed by [@&#8203;yisibl](https://redirect.github.com/yisibl).

- Trim CSS rules that will never match

  The CSS minifier will now remove rules whose selectors contain `:is()` and `:where()` as those selectors will never match. These selectors can currently be automatically generated by esbuild when you give esbuild nonsensical input such as the following:

  ```css
  /* Original code */
  div:before {
    color: green;
    &.foo {
      color: red;
    }
  }

  /* Old output (with --supported:nesting=false --minify) */
  div:before{color:green}:is().foo{color:red}

  /* New output (with --supported:nesting=false --minify) */
  div:before{color:green}
  ```

  This input is nonsensical because CSS nesting is (unfortunately) not supported inside of pseudo-elements such as `:before`. Currently esbuild generates a rule containing `:is()` in this case when you tell esbuild to transform nested CSS into non-nested CSS. I think it's reasonable to do that as it sort of helps explain what's going on (or at least indicates that something is wrong in the output). It shouldn't be present in minified code, however, so this release now strips it out.

</details>

---

#### chore(deps): update dependency rollup to v2.80.0 [security] ([#100](https://github.com/grafana/scenes-ml/pull/100))

<details>
<summary>rollup/rollup (rollup)</summary>

#### chore(deps): update dependency lodash to v4.17.23 [security] ([#95](https://github.com/grafana/scenes-ml/pull/95))

<details>
<summary>lodash/lodash (lodash)</summary>

#### fix(deps): update docusaurus monorepo to v2.4.3 ([#85](https://github.com/grafana/scenes-ml/pull/85))

<details>
<summary>facebook/docusaurus (@&#8203;docusaurus/core)</summary>

#### chore(deps): update grafana monorepo to v10.4.19 ([#83](https://github.com/grafana/scenes-ml/pull/83))

<details>
<summary>grafana/grafana (@&#8203;grafana/data)</summary>

#### fix(deps): update emotion monorepo ([#86](https://github.com/grafana/scenes-ml/pull/86))

<details>
<summary>emotion-js/emotion (@&#8203;emotion/css)</summary>

#### chore(deps): update dependency @rollup/plugin-node-resolve to v15.3.1 ([#74](https://github.com/grafana/scenes-ml/pull/74))

<details>
<summary>rollup/plugins (@&#8203;rollup/plugin-node-resolve)</summary>

### [`v15.3.1`](https://redirect.github.com/rollup/plugins/blob/HEAD/packages/node-resolve/CHANGELOG.md#v1531)

*2024-12-15*

##### Updates

- refactor: replace `test` with `includes` ([#&#8203;1787](https://redirect.github.com/rollup/plugins/issues/1787))

</details>

---

#### chore(deps): update dependency esbuild to ^0.25.0 [security] ([#72](https://github.com/grafana/scenes-ml/pull/72))

<details>
<summary>evanw/esbuild (esbuild)</summary>

### [`v0.25.0`](https://redirect.github.com/evanw/esbuild/blob/HEAD/CHANGELOG.md#0250)

[Compare Source](https://redirect.github.com/evanw/esbuild/compare/v0.24.2...v0.25.0)

**This release deliberately contains backwards-incompatible changes.** To avoid automatically picking up releases like this, you should either be pinning the exact version of `esbuild` in your `package.json` file (recommended) or be using a version range syntax that only accepts patch upgrades such as `^0.24.0` or `~0.24.0`. See npm's documentation about [semver](https://docs.npmjs.com/cli/v6/using-npm/semver/) for more information.

- Restrict access to esbuild's development server ([GHSA-67mh-4wv8-2f99](https://redirect.github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99))

  This change addresses esbuild's first security vulnerability report. Previously esbuild set the `Access-Control-Allow-Origin` header to `*` to allow esbuild's development server to be flexible in how it's used for development. However, this allows the websites you visit to make HTTP requests to esbuild's local development server, which gives read-only access to your source code if the website were to fetch your source code's specific URL. You can read more information in [the report](https://redirect.github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99).

  Starting with this release, [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) will now be disabled, and requests will now be denied if the host does not match the one provided to `--serve=`. The default host is `0.0.0.0`, which refers to all of the IP addresses that represent the local machine (e.g. both `127.0.0.1` and `192.168.0.1`). If you want to customize anything about esbuild's development server, you can [put a proxy in front of esbuild](https://esbuild.github.io/api/#serve-proxy) and modify the incoming and/or outgoing requests.

  In addition, the `serve()` API call has been changed to return an array of `hosts` instead of a single `host` string. This makes it possible to determine all of the hosts that esbuild's development server will accept.

  Thanks to [@&#8203;sapphi-red](https://redirect.github.com/sapphi-red) for reporting this issue.

- Delete output files when a build fails in watch mode ([#&#8203;3643](https://redirect.github.com/evanw/esbuild/issues/3643))

  It has been requested for esbuild to delete files when a build fails in watch mode. Previously esbuild left the old files in place, which could cause people to not immediately realize that the most recent build failed. With this release, esbuild will now delete all output files if a rebuild fails. Fixing the build error and triggering another rebuild will restore all output files again.

- Fix correctness issues with the CSS nesting transform ([#&#8203;3620](https://redirect.github.com/evanw/esbuild/issues/3620), [#&#8203;3877](https://redirect.github.com/evanw/esbuild/issues/3877), [#&#8203;3933](https://redirect.github.com/evanw/esbuild/issues/3933), [#&#8203;3997](https://redirect.github.com/evanw/esbuild/issues/3997), [#&#8203;4005](https://redirect.github.com/evanw/esbuild/issues/4005), [#&#8203;4037](https://redirect.github.com/evanw/esbuild/pull/4037), [#&#8203;4038](https://redirect.github.com/evanw/esbuild/pull/4038))

  This release fixes the following problems:

  - Naive expansion of CSS nesting can result in an exponential blow-up of generated CSS if each nesting level has multiple selectors. Previously esbuild sometimes collapsed individual nesting levels using `:is()` to limit expansion. However, this collapsing wasn't correct in some cases, so it has been removed to fix correctness issues.

    ```css
    /* Original code */
    .parent {
      > .a,
      > .b1 > .b2 {
        color: red;
      }
    }

    /* Old output (with --supported:nesting=false) */
    .parent > :is(.a, .b1 > .b2) {
      color: red;
    }

    /* New output (with --supported:nesting=false) */
    .parent > .a,
    .parent > .b1 > .b2 {
      color: red;
    }
    ```

    Thanks to [@&#8203;tim-we](https://redirect.github.com/tim-we) for working on a fix.

  - The `&` CSS nesting selector can be repeated multiple times to increase CSS specificity. Previously esbuild ignored this possibility and incorrectly considered `&&` to have the same specificity as `&`. With this release, this should now work correctly:

    ```css
    /* Original code (color should be red) */
    div {
      && { color: red }
      & { color: blue }
    }

    /* Old output (with --supported:nesting=false) */
    div {
      color: red;
    }
    div {
      color: blue;
    }

    /* New output (with --supported:nesting=false) */
    div:is(div) {
      color: red;
    }
    div {
      color: blue;
    }
    ```

    Thanks to [@&#8203;CPunisher](https://redirect.github.com/CPunisher) for working on a fix.

  - Previously transforming nested CSS incorrectly removed leading combinators from within pseudoclass selectors such as `:where()`. This edge case has been fixed and how has test coverage.

    ```css
    /* Original code */
    a b:has(> span) {
      a & {
        color: green;
      }
    }

    /* Old output (with --supported:nesting=false) */
    a :is(a b:has(span)) {
      color: green;
    }

    /* New output (with --supported:nesting=false) */
    a :is(a b:has(> span)) {
      color: green;
    }
    ```

    This fix was contributed by [@&#8203;NoremacNergfol](https://redirect.github.com/NoremacNergfol).

  - The CSS minifier contains logic to remove the `&` selector when it can be implied, which happens when there is only one and it's the leading token. However, this logic was incorrectly also applied to selector lists inside of pseudo-class selectors such as `:where()`. With this release, the minifier will now avoid applying this logic in this edge case:

    ```css
    /* Original code */
    .a {
      & .b { color: red }
      :where(& .b) { color: blue }
    }

    /* Old output (with --minify) */
    .a{.b{color:red}:where(.b){color:#&#8203;00f}}

    /* New output (with --minify) */
    .a{.b{color:red}:where(& .b){color:#&#8203;00f}}
    ```

- Fix some correctness issues with source maps ([#&#8203;1745](https://redirect.github.com/evanw/esbuild/issues/1745), [#&#8203;3183](https://redirect.github.com/evanw/esbuild/issues/3183), [#&#8203;3613](https://redirect.github.com/evanw/esbuild/issues/3613), [#&#8203;3982](https://redirect.github.com/evanw/esbuild/issues/3982))

  Previously esbuild incorrectly treated source map path references as file paths instead of as URLs. With this release, esbuild will now treat source map path references as URLs. This fixes the following problems with source maps:

  - File names in `sourceMappingURL` that contained a space previously did not encode the space as `%20`, which resulted in JavaScript tools (including esbuild) failing to read that path back in when consuming the generated output file. This should now be fixed.

  - Absolute URLs in `sourceMappingURL` that use the `file://` scheme previously attempted to read from a folder called `file:`. These URLs should now be recognized and parsed correctly.

  - Entries in the `sources` array in the source map are now treated as URLs instead of file paths. The correct behavior for this is much more clear now that source maps has a [formal specification](https://tc39.es/ecma426/). Many thanks to those who worked on the specification.

- Fix incorrect package for `@esbuild/netbsd-arm64` ([#&#8203;4018](https://redirect.github.com/evanw/esbuild/issues/4018))

  Due to a copy+paste typo, the binary published to `@esbuild/netbsd-arm64` was not actually for `arm64`, and didn't run in that environment. This release should fix running esbuild in that environment (NetBSD on 64-bit ARM). Sorry about the mistake.

- Fix a minification bug with bitwise operators and bigints ([#&#8203;4065](https://redirect.github.com/evanw/esbuild/issues/4065))

  This change removes an incorrect assumption in esbuild that all bitwise operators result in a numeric integer. That assumption was correct up until the introduction of bigints in ES2020, but is no longer correct because almost all bitwise operators now operate on both numbers and bigints. Here's an example of the incorrect minification:

  ```js
  // Original code
  if ((a & b) !== 0) found = true

  // Old output (with --minify)
  a&b&&(found=!0);

  // New output (with --minify)
  (a&b)!==0&&(found=!0);
  ```

- Fix esbuild incorrectly rejecting valid TypeScript edge case ([#&#8203;4027](https://redirect.github.com/evanw/esbuild/issues/4027))

  The following TypeScript code is valid:

  ```ts
  export function open(async?: boolean): void {
    console.log(async as boolean)
  }
  ```

  Before this version, esbuild would fail to parse this with a syntax error as it expected the token sequence `async as ...` to be the start of an async arrow function expression `async as => ...`. This edge case should be parsed correctly by esbuild starting with this release.

- Transform BigInt values into constructor calls when unsupported ([#&#8203;4049](https://redirect.github.com/evanw/esbuild/issues/4049))

  Previously esbuild would refuse to compile the BigInt literals (such as `123n`) if they are unsupported in the configured target environment (such as with `--target=es6`). The rationale was that they cannot be polyfilled effectively because they change the behavior of JavaScript's arithmetic operators and JavaScript doesn't have operator overloading.

  However, this prevents using esbuild with certain libraries that would otherwise work if BigInt literals were ignored, such as with old versions of the [`buffer` library](https://redirect.github.com/feross/buffer) before the library fixed support for running in environments without BigInt support. So with this release, esbuild will now turn BigInt literals into BigInt constructor calls (so `123n` becomes `BigInt(123)`) and generate a warning in this case. You can turn off the warning with `--log-override:bigint=silent` or restore the warning to an error with `--log-override:bigint=error` if needed.

- Change how `console` API dropping works ([#&#8203;4020](https://redirect.github.com/evanw/esbuild/issues/4020))

  Previously the `--drop:console` feature replaced all method calls off of the `console` global with `undefined` regardless of how long the property access chain was (so it applied to `console.log()` and `console.log.call(console)` and `console.log.not.a.method()`). However, it was pointed out that this breaks uses of `console.log.bind(console)`. That's also incompatible with Terser's implementation of the feature, which is where this feature originally came from (it does support `bind`). So with this release, using this feature with esbuild will now only replace one level of method call (unless extended by `call` or `apply`) and will replace the method being called with an empty function in complex cases:

  ```js
  // Original code
  const x = console.log('x')
  const y = console.log.call(console, 'y')
  const z = console.log.bind(console)('z')

  // Old output (with --drop-console)
  const x = void 0;
  const y = void 0;
  const z = (void 0)("z");

  // New output (with --drop-console)
  const x = void 0;
  const y = void 0;
  const z = (() => {
  }).bind(console)("z");
  ```

  This should more closely match Terser's existing behavior.

- Allow BigInt literals as `define` values

  With this release, you can now use BigInt literals as define values, such as with `--define:FOO=123n`. Previously trying to do this resulted in a syntax error.

- Fix a bug with resolve extensions in `node_modules` ([#&#8203;4053](https://redirect.github.com/evanw/esbuild/issues/4053))

  The `--resolve-extensions=` option lets you specify the order in which to try resolving implicit file extensions. For complicated reasons, esbuild reorders TypeScript file extensions after JavaScript ones inside of `node_modules` so that JavaScript source code is always preferred to TypeScript source code inside of dependencies. However, this reordering had a bug that could accidentally change the relative order of TypeScript file extensions if one of them was a prefix of the other. That bug has been fixed in this release. You can see the issue for details.

- Better minification of statically-determined `switch` cases ([#&#8203;4028](https://redirect.github.com/evanw/esbuild/issues/4028))

  With this release, esbuild will now try to trim unused code within `switch` statements when the test expression and `case` expressions are primitive literals. This can arise when the test expression is an identifier that is substituted for a primitive literal at compile time. For example:

  ```js
  // Original code
  switch (MODE) {
    case 'dev':
      installDevToolsConsole()
      break
    case 'prod':
      return
    default:
      throw new Error
  }

  // Old output (with --minify '--define:MODE="prod"')
  switch("prod"){case"dev":installDevToolsConsole();break;case"prod":return;default:throw new Error}

  // New output (with --minify '--define:MODE="prod"')
  return;
  ```

- Emit `/* @&#8203;__KEY__ */` for string literals derived from property names ([#&#8203;4034](https://redirect.github.com/evanw/esbuild/issues/4034))

  Property name mangling is an advanced feature that shortens certain property names for better minification (I say "advanced feature" because it's very easy to break your code with it). Sometimes you need to store a property name in a string, such as `obj.get('foo')` instead of `obj.foo`. JavaScript minifiers such as esbuild and [Terser](https://terser.org/) have a convention where a `/* @&#8203;__KEY__ */` comment before the string makes it behave like a property name. So `obj.get(/* @&#8203;__KEY__ */ 'foo')` allows the contents of the string `'foo'` to be shortened.

  However, esbuild sometimes itself generates string literals containing property names when transforming code, such as when lowering class fields to ES6 or when transforming TypeScript decorators. Previously esbuild didn't generate its own `/* @&#8203;__KEY__ */` comments in this case, which means that minifying your code by running esbuild again on its own output wouldn't work correctly (this does not affect people that both minify and transform their code in a single step).

  With this release, esbuild will now generate `/* @&#8203;__KEY__ */` comments for property names in generated string literals. To avoid lots of unnecessary output for people that don't use this advanced feature, the generated comments will only be present when the feature is active. If you want to generate the comments but not actually mangle any property names, you can use a flag that has no effect such as `--reserve-props=.`, which tells esbuild to not mangle any property names (but still activates this feature).

- The `text` loader now strips the UTF-8 BOM if present ([#&#8203;3935](https://redirect.github.com/evanw/esbuild/issues/3935))

  Some software (such as Notepad on Windows) can create text files that start with the three bytes `0xEF 0xBB 0xBF`, which is referred to as the "byte order mark". This prefix is intended to be removed before using the text. Previously esbuild's `text` loader included this byte sequence in the string, which turns into a prefix of `\uFEFF` in a JavaScript string when decoded from UTF-8. With this release, esbuild's `text` loader will now remove these bytes when they occur at the start of the file.

- Omit legal comment output files when empty ([#&#8203;3670](https://redirect.github.com/evanw/esbuild/issues/3670))

  Previously configuring esbuild with `--legal-comment=external` or `--legal-comment=linked` would always generate a `.LEGAL.txt` output file even if it was empty. Starting with this release, esbuild will now only do this if the file will be non-empty. This should result in a more organized output directory in some cases.

- Update Go from 1.23.1 to 1.23.5 ([#&#8203;4056](https://redirect.github.com/evanw/esbuild/issues/4056), [#&#8203;4057](https://redirect.github.com/evanw/esbuild/pull/4057))

  This should have no effect on existing code as this version change does not change Go's operating system support. It may remove certain reports from vulnerability scanners that detect which version of the Go compiler esbuild uses.

  This PR was contributed by [@&#8203;MikeWillCook](https://redirect.github.com/MikeWillCook).

- Allow passing a port of 0 to the development server ([#&#8203;3692](https://redirect.github.com/evanw/esbuild/issues/3692))

  Unix sockets interpret a port of 0 to mean "pick a random unused port in the [ephemeral port](https://en.wikipedia.org/wiki/Ephemeral_port) range". However, esbuild's default behavior when the port is not specified is to pick the first unused port starting from 8000 and upward. This is more convenient because port 8000 is typically free, so you can for example restart the development server and reload your app in the browser without needing to change the port in the URL. Since esbuild is written in Go (which does not have optional fields like JavaScript), not specifying the port in Go means it defaults to 0, so previously passing a port of 0 to esbuild caused port 8000 to be picked.

  Starting with this release, passing a port of 0 to esbuild when using the CLI or the JS API will now pass port 0 to the OS, which will pick a random ephemeral port. To make this possible, the `Port` option in the Go API has been changed from `uint16` to `int` (to allow for additional sentinel values) and passing a port of -1 in Go now picks a random port. Both the CLI and JS APIs now remap an explicitly-provided port of 0 into -1 for the internal Go API.

  Another option would have been to change `Port` in Go from `uint16` to `*uint16` (Go's closest equivalent of `number | undefined`). However, that would make the common case of providing an explicit port in Go very awkward as Go doesn't support taking the address of integer constants. This tradeoff isn't worth it as picking a random ephemeral port is a rare use case. So the CLI and JS APIs should now match standard Unix behavior when the port is 0, but you need to use -1 instead with Go API.

- Minification now avoids inlining constants with direct `eval` ([#&#8203;4055](https://redirect.github.com/evanw/esbuild/issues/4055))

  Direct `eval` can be used to introduce a new variable like this:

  ```js
  const variable = false
  ;(function () {
    eval("var variable = true")
    console.log(variable)
  })()
  ```

  Previously esbuild inlined `variable` here (which became `false`), which changed the behavior of the code. This inlining is now avoided, but please keep in mind that direct `eval` breaks many assumptions that JavaScript tools hold about normal code (especially when bundling) and I do not recommend using it. There are usually better alternatives that have a more localized impact on your code. You can read more about this here: <https://esbuild.github.io/link/direct-eval/>

---

#### 🐛 Bug Fix

- fix: compare original data against bounds for anomaly detection [#157](https://github.com/grafana/scenes-ml/pull/157) ([@sd2k](https://github.com/sd2k))
- chore(deps): update dependency esbuild to ^0.28.1 [#165](https://github.com/grafana/scenes-ml/pull/165) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): combined dependency updates [#164](https://github.com/grafana/scenes-ml/pull/164) ([@sd2k](https://github.com/sd2k))
- chore(deps): update dependency @types/lodash to v4.17.25 [#158](https://github.com/grafana/scenes-ml/pull/158) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- fix(security/low/packages/scenes-ml): update dependency esbuild to ^0.28.0 [security] [#152](https://github.com/grafana/scenes-ml/pull/152) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]) [@sd2k](https://github.com/sd2k))
- chore(deps): update swc monorepo [#143](https://github.com/grafana/scenes-ml/pull/143) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update yarn to v4.18.0 [#144](https://github.com/grafana/scenes-ml/pull/144) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/node to v20.19.43 [#153](https://github.com/grafana/scenes-ml/pull/153) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency ts-jest to v29.4.12 [#155](https://github.com/grafana/scenes-ml/pull/155) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @testing-library/user-event to v14.6.7 [#156](https://github.com/grafana/scenes-ml/pull/156) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/react-grid-layout to v2 [#150](https://github.com/grafana/scenes-ml/pull/150) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency lodash to v4.18.1 [security] [#133](https://github.com/grafana/scenes-ml/pull/133) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @grafana/tsconfig to v2 [#121](https://github.com/grafana/scenes-ml/pull/121) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @rollup/plugin-node-resolve to v16 [#122](https://github.com/grafana/scenes-ml/pull/122) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/history to v5 [#124](https://github.com/grafana/scenes-ml/pull/124) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- fix(deps): update dependency @bsull/augurs to v0.10.2 [#115](https://github.com/grafana/scenes-ml/pull/115) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update swc monorepo [#111](https://github.com/grafana/scenes-ml/pull/111) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency typescript to v5.9.3 [#109](https://github.com/grafana/scenes-ml/pull/109) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update testing-library monorepo [#112](https://github.com/grafana/scenes-ml/pull/112) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update yarn to v4.12.0 [#113](https://github.com/grafana/scenes-ml/pull/113) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/lodash to v4.17.24 [#92](https://github.com/grafana/scenes-ml/pull/92) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/node to v20.19.37 [#93](https://github.com/grafana/scenes-ml/pull/93) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency esbuild to ^0.27.2 [#105](https://github.com/grafana/scenes-ml/pull/105) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency ts-jest to v29.4.6 [#108](https://github.com/grafana/scenes-ml/pull/108) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- fix(deps): update dependency rxjs to v7.8.2 [#84](https://github.com/grafana/scenes-ml/pull/84) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]) [@sd2k](https://github.com/sd2k))
- chore(deps): update dependency esbuild to ^0.27.0 [#94](https://github.com/grafana/scenes-ml/pull/94) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency rollup to v2.80.0 [security] [#100](https://github.com/grafana/scenes-ml/pull/100) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency lodash to v4.17.23 [security] [#95](https://github.com/grafana/scenes-ml/pull/95) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- Bump http-proxy-middleware from 2.0.7 to 2.0.9 [#62](https://github.com/grafana/scenes-ml/pull/62) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- fix(deps): update docusaurus monorepo to v2.4.3 [#85](https://github.com/grafana/scenes-ml/pull/85) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update grafana monorepo to v10.4.19 [#83](https://github.com/grafana/scenes-ml/pull/83) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- fix(deps): update emotion monorepo [#86](https://github.com/grafana/scenes-ml/pull/86) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- fix(deps): update emotion monorepo ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/jest to v29.5.14 [#75](https://github.com/grafana/scenes-ml/pull/75) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @rollup/plugin-node-resolve to v15.3.1 [#74](https://github.com/grafana/scenes-ml/pull/74) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/react-grid-layout to v1.3.6 [#76](https://github.com/grafana/scenes-ml/pull/76) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/react-grid-layout to v1.3.6 ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/jest to v29.5.14 ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @rollup/plugin-node-resolve to v15.3.1 ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/react-virtualized-auto-sizer to v1.0.8 [#78](https://github.com/grafana/scenes-ml/pull/78) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency @types/react-virtualized-auto-sizer to v1.0.8 ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore(deps): update dependency esbuild to ^0.25.0 [security] [#72](https://github.com/grafana/scenes-ml/pull/72) ([@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot]))
- chore: run prettier [#71](https://github.com/grafana/scenes-ml/pull/71) ([@sd2k](https://github.com/sd2k))
- chore: run prettier ([@sd2k](https://github.com/sd2k))
- docs: point to Getting Started guide in READMEs [#63](https://github.com/grafana/scenes-ml/pull/63) ([@sd2k](https://github.com/sd2k))
- Merge branch 'main' into point-to-getting-started ([@sd2k](https://github.com/sd2k))
- docs: point to Getting Started guide in READMEs ([@sd2k](https://github.com/sd2k))
- Bump cross-spawn from 7.0.3 to 7.0.6 [#57](https://github.com/grafana/scenes-ml/pull/57) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### Authors: 3

- [@dependabot[bot]](https://github.com/dependabot[bot])
- [@renovate-sh-app[bot]](https://github.com/renovate-sh-app[bot])
- Ben Sully ([@sd2k](https://github.com/sd2k))

---

# v0.5.0 (Wed Jan 22 2025)

#### 🚀 Enhancement

- chore: bump several deps [#51](https://github.com/grafana/scenes-ml/pull/51) ([@sd2k](https://github.com/sd2k))
- Bump webpack from 5.91.0 to 5.94.0 [#35](https://github.com/grafana/scenes-ml/pull/35) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump express from 4.19.2 to 4.21.1 [#47](https://github.com/grafana/scenes-ml/pull/47) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### 🐛 Bug Fix

- chore: loosen @grafana/* dependency versions [#56](https://github.com/grafana/scenes-ml/pull/56) ([@sd2k](https://github.com/sd2k))
- chore: loosen @grafana/* dependency versions ([@sd2k](https://github.com/sd2k))
- Bump versions to v0.4.0 and update changelogs \[skip ci\] [#53](https://github.com/grafana/scenes-ml/pull/53) ([@sd2k](https://github.com/sd2k))
- Bump versions to v0.4.0 and update changelogs \[skip ci\] ([@sd2k](https://github.com/sd2k))
- chore: bump several deps ([@sd2k](https://github.com/sd2k))
- Bump rollup from 2.79.1 to 2.79.2 in /packages/scenes-ml [#41](https://github.com/grafana/scenes-ml/pull/41) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@sd2k](https://github.com/sd2k))
- Bump rollup from 2.79.1 to 2.79.2 in /packages/scenes-ml ([@dependabot[bot]](https://github.com/dependabot[bot]))
- Bump fast-loops from 1.1.3 to 1.1.4 [#33](https://github.com/grafana/scenes-ml/pull/33) ([@dependabot[bot]](https://github.com/dependabot[bot]))
- feat: add SceneTimeSeriesClusterer component [#48](https://github.com/grafana/scenes-ml/pull/48) ([@sd2k](https://github.com/sd2k))
- feat: add SceneTimeSeriesClusterer component ([@sd2k](https://github.com/sd2k))
- fix: use === instead of == [#44](https://github.com/grafana/scenes-ml/pull/44) ([@sd2k](https://github.com/sd2k))
- chore: bump @bsull/augurs to 0.6.0 [#46](https://github.com/grafana/scenes-ml/pull/46) ([@sd2k](https://github.com/sd2k))
- fix: use === instead of == ([@sd2k](https://github.com/sd2k))
- Fix logging init ([@sd2k](https://github.com/sd2k))
- chore: bump @bsull/augurs to 0.6.0 ([@sd2k](https://github.com/sd2k))
- Merge branch 'main' into dont-specify-old-token ([@sd2k](https://github.com/sd2k))
- feat: add support for MAD outlier detection [#43](https://github.com/grafana/scenes-ml/pull/43) ([@sd2k](https://github.com/sd2k))
- feat: add support for MAD outlier detection ([@sd2k](https://github.com/sd2k))
- feat: add Prophet model option to baseliner [#42](https://github.com/grafana/scenes-ml/pull/42) ([@sd2k](https://github.com/sd2k))
- feat: add Prophet model option to baseliner ([@sd2k](https://github.com/sd2k))
- SceneOutlierDetector: fix series number in callback [#34](https://github.com/grafana/scenes-ml/pull/34) ([@matyax](https://github.com/matyax))
- SceneOutlierDetector: fix series number in callback ([@matyax](https://github.com/matyax))

#### 🔩 Dependency Updates

- chore: bump yarn to 4.5.1 [#50](https://github.com/grafana/scenes-ml/pull/50) ([@sd2k](https://github.com/sd2k))

#### Authors: 3

- [@dependabot[bot]](https://github.com/dependabot[bot])
- Ben Sully ([@sd2k](https://github.com/sd2k))
- Matias Chomicki ([@matyax](https://github.com/matyax))

---

# v0.4.0 (Wed Nov 13 2024)

Accidental release due to CI issues, no changes since v0.3.0.

---

# v0.3.0 (Wed Nov 13 2024)

 #### 🚀 Enhancement

- `grafana-scenes-ml`
  - chore: bump several deps [#51](https://github.com/grafana/scenes-ml/pull/51) ([@sd2k](https://github.com/sd2k))
  - Bump webpack from 5.91.0 to 5.94.0 [#35](https://github.com/grafana/scenes-ml/pull/35) ([@dependabot[bot]](https://github.com/dependabot[bot]))
  - Bump express from 4.19.2 to 4.21.1 [#47](https://github.com/grafana/scenes-ml/pull/47) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### 🐛 Bug Fix

- `grafana-scenes-ml`
  - ci: don't use custom github action for yarn install [#52](https://github.com/grafana/scenes-ml/pull/52) ([@sd2k](https://github.com/sd2k))
  - Bump rollup from 2.79.1 to 2.79.2 in /packages/scenes-ml [#41](https://github.com/grafana/scenes-ml/pull/41) ([@dependabot[bot]](https://github.com/dependabot[bot]) [@sd2k](https://github.com/sd2k))
  - Bump http-proxy-middleware from 2.0.6 to 2.0.7 [#49](https://github.com/grafana/scenes-ml/pull/49) ([@dependabot[bot]](https://github.com/dependabot[bot]))
  - Bump fast-loops from 1.1.3 to 1.1.4 [#33](https://github.com/grafana/scenes-ml/pull/33) ([@dependabot[bot]](https://github.com/dependabot[bot]))
  - feat: add SceneTimeSeriesClusterer component [#48](https://github.com/grafana/scenes-ml/pull/48) ([@sd2k](https://github.com/sd2k))
  - fix: use === instead of == [#44](https://github.com/grafana/scenes-ml/pull/44) ([@sd2k](https://github.com/sd2k))
  - chore: bump @bsull/augurs to 0.6.0 [#46](https://github.com/grafana/scenes-ml/pull/46) ([@sd2k](https://github.com/sd2k))
  - ci: don't specify now-nonexistent token [#39](https://github.com/grafana/scenes-ml/pull/39) ([@sd2k](https://github.com/sd2k))
  - feat: add support for MAD outlier detection [#43](https://github.com/grafana/scenes-ml/pull/43) ([@sd2k](https://github.com/sd2k))
  - feat: add Prophet model option to baseliner [#42](https://github.com/grafana/scenes-ml/pull/42) ([@sd2k](https://github.com/sd2k))
  - SceneOutlierDetector: fix series number in callback [#34](https://github.com/grafana/scenes-ml/pull/34) ([@matyax](https://github.com/matyax))
  - Bump ws from 7.5.9 to 7.5.10 [#32](https://github.com/grafana/scenes-ml/pull/32) ([@dependabot[bot]](https://github.com/dependabot[bot]))

#### ⚠️ Pushed to `main`

- `grafana-scenes-ml`
  - Remove @types/lodash from dependencies ([@sd2k](https://github.com/sd2k))

#### 🔩 Dependency Updates

- `grafana-scenes-ml`
  - chore: bump yarn to 4.5.1 [#50](https://github.com/grafana/scenes-ml/pull/50) ([@sd2k](https://github.com/sd2k))

#### Authors: 3

- [@dependabot[bot]](https://github.com/dependabot[bot])
- Ben Sully ([@sd2k](https://github.com/sd2k))
- Matias Chomicki ([@matyax](https://github.com/matyax))

---

# v0.2.0 (Tue Jun 25 2024)

#### 🚀 Enhancement

- Use a peer dependency for scenes instead of a regular dependency [#31](https://github.com/grafana/scenes-ml/pull/31) ([@sd2k](https://github.com/sd2k))

#### 🐛 Bug Fix

- Use a peer dependency for scenes instead of a regular dependency ([@sd2k](https://github.com/sd2k))

#### Authors: 1

- Ben Sully ([@sd2k](https://github.com/sd2k))

---

# v0.1.0 (Fri Jun 21 2024)

#### 🐛 Bug Fix

- chore: loosen scenes requirement [#29](https://github.com/grafana/scenes-ml/pull/29) ([@sd2k](https://github.com/sd2k))
- Add docs to Outlier type and fields [#30](https://github.com/grafana/scenes-ml/pull/30) ([@sd2k](https://github.com/sd2k))
- Add docs to Outlier type and fields ([@sd2k](https://github.com/sd2k))
- chore: loosen scenes requirement ([@sd2k](https://github.com/sd2k))
- feat: add onAnomalyDetected callback to SceneBaseliner [#26](https://github.com/grafana/scenes-ml/pull/26) ([@sd2k](https://github.com/sd2k))
- feat: add onAnomalyDetected callback to SceneBaseliner ([@sd2k](https://github.com/sd2k))
- Update homepage URL in package.json [#25](https://github.com/grafana/scenes-ml/pull/25) ([@sd2k](https://github.com/sd2k))
- Update homepage URL in package.json ([@sd2k](https://github.com/sd2k))

#### Authors: 1

- Ben Sully ([@sd2k](https://github.com/sd2k))
