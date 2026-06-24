# safekit

> Zero-dependency Try monad for TypeScript.
> Execute risky code and handle exceptions as values, not control flow.

[![npm](https://img.shields.io/npm/v/safekit)](https://www.npmjs.com/package/safekit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Port of Java [Vavr Try](https://docs.vavr.io/#_try) / Scala [`scala.util.Try`](https://www.scala-lang.org/api/current/scala/util/Try.html). The existing `try-monad` npm package has been abandoned since 2017 (2 downloads/week).

## Install

```bash
npm install safekit
```

## The problem Try solves

`Result<T,E>` (neverthrow, resultkit) wraps **already-computed** values where you know the error type ahead of time. `Try<T>` **executes** a computation and captures **any thrown exception** automatically — no need to know what might throw:

```typescript
// Result: you write the error path manually
const result: Result<User, ApiError> = ok(user);

// Try: exception is captured automatically
const t = Try.of(() => JSON.parse(rawJson));  // SyntaxError captured if thrown
```

## Quick start

```typescript
import { Try } from "safekit";

const result = Try.of(() => JSON.parse(rawInput))
  .map(obj => obj.name as string)   // skipped if parse failed
  .filter(name => name.length > 0)  // skipped if map failed
  .recover(e => "anonymous")        // handles any prior failure
  .get();                           // never throws — recover caught everything
```

## API

### Try.of(fn)

Execute a function and capture the result or exception:

```typescript
const t1 = Try.of(() => parseInt("42", 10));   // Success(42)
const t2 = Try.of(() => JSON.parse("bad"));     // Failure(SyntaxError)
const t3 = Try.of(() => { throw "string err"; }); // Failure("string err")
```

### Try.ofAsync(fn) — async computations

```typescript
const t = await Try.ofAsync(async () => fetch("/api/users").then(r => r.json()));
// Never rejects — always resolves to Success or Failure

if (t.isSuccess()) {
  console.log(t.get()); // the parsed JSON
} else {
  console.error(t.getCause()); // the fetch/parse error
}
```

### Transformations (fluent chaining)

```typescript
Try.of(() => "  hello  ")
  .map(s => s.trim())             // Success("hello")
  .map(s => s.toUpperCase())      // Success("HELLO")
  .filter(s => s.length > 3)      // Success("HELLO") — passes
  .flatMap(s => Try.of(() => s))  // Success("HELLO")
  .get()                          // "HELLO"
```

All transformations on a `Failure` are no-ops — the original failure propagates:

```typescript
Try.of(() => { throw new Error("fail"); })
  .map(x => x)         // no-op
  .filter(() => true)  // no-op
  .getOrElse("default") // "default"
```

### Recovery

```typescript
// recover — provide a fallback value
const t = Try.of(() => riskyParse())
  .recover(e => fallbackValue);

// recoverWith — provide a fallback Try computation
const t = Try.of(() => fetchPrimary())
  .recoverWith(e => Try.of(() => fetchBackup()));
```

### Extracting values

```typescript
const t = Try.of(() => compute());

t.get()                              // value or rethrows
t.getOrElse(defaultValue)            // value or default
t.getOrElseGet(cause => handleErr()) // value or call fn(cause)
t.getOrElseThrow(e => new MyErr(e))  // value or throw custom error
t.toNullable()                       // value or null
t.toArray()                          // [value] or []
t.getCause()                         // cause (throws if Success)
```

### Fold

```typescript
const message = Try.of(() => riskyOp()).fold(
  value => `Success: ${value}`,
  cause => `Error: ${(cause as Error).message}`,
);
```

### Side effects with tap

```typescript
Try.of(() => loadConfig())
  .tap(
    config => logger.info("Loaded config", config),
    err => logger.error("Config load failed", err),
  )
  .getOrElse(defaultConfig);
```

### Try.all — collect multiple results

```typescript
const t = Try.all([
  Try.of(() => parseA(rawA)),
  Try.of(() => parseB(rawB)),
  Try.of(() => parseC(rawC)),
]);

if (t.isSuccess()) {
  const [a, b, c] = t.get();
} else {
  console.error("First failure:", t.getCause());
}
```

### instanceof narrowing

```typescript
import { Try, Success, Failure } from "safekit";

const t = Try.of(() => 42);
if (t instanceof Success) {
  t.get(); // TypeScript knows it's Success here
} else {
  t.getCause(); // TypeScript knows it's Failure here
}
```

## Comparison with alternatives

| Package | Lazy (captures exceptions) | TypeScript | Active | Zero deps |
|---|---|---|---|---|
| **safekit (Try)** | ✅ | ✅ | ✅ | ✅ |
| neverthrow | ❌ (wraps already-computed) | ✅ | ✅ | ✅ |
| resultkit | ❌ (wraps already-computed) | ✅ | ✅ | ✅ |
| try-monad | ✅ | ❌ | ❌ (abandoned 2017) | ✅ |
| fp-ts | ✅ (TaskEither) | ✅ | ✅ | ❌ (heavy) |
| Java Vavr Try | ✅ | n/a | ✅ | n/a |
| Scala Try | ✅ | n/a | ✅ | n/a |

## License

MIT © [trananhtung](https://github.com/trananhtung)
