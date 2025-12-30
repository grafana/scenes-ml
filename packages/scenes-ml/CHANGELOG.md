# v1.0.0 (Tue Dec 30 2025)

### Release Notes

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
