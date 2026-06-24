/**
 * Try<T> — a container representing a computation that may succeed (Success<T>)
 * or fail with an exception (Failure<T>).
 *
 * Port of Java Vavr Try / Scala scala.util.Try.
 *
 * Unlike Result<T,E> (which wraps already-computed values), Try.of() executes
 * the computation and captures any thrown exception automatically:
 *
 * @example
 * const result = Try.of(() => JSON.parse(raw))
 *   .map(obj => obj.name as string)
 *   .recover(e => "anonymous")
 *   .get(); // never throws — recover caught the failure
 *
 * @example
 * const t = Try.of(() => parseInt("abc", 10));
 * t.isSuccess();   // true — parseInt returns NaN, not throws
 * t.get();         // NaN
 *
 * @example
 * const t = Try.of(() => { throw new Error("boom"); });
 * t.isFailure();   // true
 * t.getOrElse(0);  // 0
 * t.getCause();    // Error("boom")
 */
export type TryLike<T> = Success<T> | Failure<T>;

abstract class TryBase<T> {
  abstract isSuccess(): this is Success<T>;
  abstract isFailure(): this is Failure<T>;

  /** Get the value if Success, otherwise throw the captured cause. */
  abstract get(): T;

  /** Get the value if Success, otherwise return `defaultValue`. */
  abstract getOrElse<U>(defaultValue: U): T | U;

  /** Get the value if Success, otherwise call `fn(cause)` and return its result. */
  abstract getOrElseGet<U>(fn: (cause: unknown) => U): T | U;

  /** Get the value if Success, otherwise throw `fn(cause)`. */
  abstract getOrElseThrow(fn: (cause: unknown) => unknown): T;

  /** Get the cause if Failure, otherwise throw. */
  abstract getCause(): unknown;

  /** Transform the value if Success; propagate Failure. */
  abstract map<U>(fn: (value: T) => U): TryLike<U>;

  /** Transform the value if Success with a fn that itself returns Try; propagate Failure. */
  abstract flatMap<U>(fn: (value: T) => TryLike<U>): TryLike<U>;

  /** Filter the value; if predicate is false (or throws) returns Failure. */
  abstract filter(predicate: (value: T) => boolean, message?: string): TryLike<T>;

  /**
   * Recover from Failure: if Failure, call fn(cause) and return its result as Success.
   * If fn throws, return a new Failure.
   */
  abstract recover<U>(fn: (cause: unknown) => U): TryLike<T | U>;

  /**
   * Recover from Failure with a fn that returns another Try.
   * If Success, passes through unchanged.
   */
  abstract recoverWith<U>(fn: (cause: unknown) => TryLike<U>): TryLike<T | U>;

  /**
   * Apply `onSuccess` or `onFailure` and return the Try unchanged (for side effects).
   */
  abstract tap(onSuccess?: (value: T) => void, onFailure?: (cause: unknown) => void): TryLike<T>;

  /**
   * Reduce Try<T> to U: applies `onSuccess(value)` or `onFailure(cause)`.
   * Like Scala's `fold`.
   */
  abstract fold<U>(onSuccess: (value: T) => U, onFailure: (cause: unknown) => U): U;

  /**
   * Convert to an array: [value] if Success, [] if Failure.
   */
  abstract toArray(): T[];

  /**
   * Convert to a nullable value: value if Success, null if Failure.
   */
  abstract toNullable(): T | null;
}

export class Success<T> extends TryBase<T> {
  constructor(private readonly _value: T) { super(); }

  isSuccess(): this is Success<T> { return true; }
  isFailure(): this is Failure<T> { return false; }

  get(): T { return this._value; }
  getOrElse<U>(_defaultValue: U): T { return this._value; }
  getOrElseGet<U>(_fn: (cause: unknown) => U): T { return this._value; }
  getOrElseThrow(_fn: (cause: unknown) => unknown): T { return this._value; }
  getCause(): never { throw new Error("Try.getCause() called on a Success"); }

  map<U>(fn: (value: T) => U): TryLike<U> { return Try.of(() => fn(this._value)); }
  flatMap<U>(fn: (value: T) => TryLike<U>): TryLike<U> {
    try { return fn(this._value); } catch (e) { return new Failure<U>(e); }
  }

  filter(predicate: (value: T) => boolean, message?: string): TryLike<T> {
    try {
      if (predicate(this._value)) return this;
      return new Failure<T>(new Error(message ?? `Try.filter: predicate returned false for ${String(this._value)}`));
    } catch (e) { return new Failure<T>(e); }
  }

  recover<U>(_fn: (cause: unknown) => U): TryLike<T> { return this; }
  recoverWith<U>(_fn: (cause: unknown) => TryLike<U>): TryLike<T> { return this; }

  tap(onSuccess?: (value: T) => void, _onFailure?: (cause: unknown) => void): TryLike<T> {
    try { onSuccess?.(this._value); } catch { /* ignore tap errors */ }
    return this;
  }

  fold<U>(onSuccess: (value: T) => U, _onFailure: (cause: unknown) => U): U { return onSuccess(this._value); }
  toArray(): T[] { return [this._value]; }
  toNullable(): T { return this._value; }
}

export class Failure<T> extends TryBase<T> {
  constructor(private readonly _cause: unknown) { super(); }

  isSuccess(): this is Success<T> { return false; }
  isFailure(): this is Failure<T> { return true; }

  get(): never { throw this._cause; }
  getOrElse<U>(defaultValue: U): U { return defaultValue; }
  getOrElseGet<U>(fn: (cause: unknown) => U): U { return fn(this._cause); }
  getOrElseThrow(fn: (cause: unknown) => unknown): never { throw fn(this._cause); }
  getCause(): unknown { return this._cause; }

  map<U>(_fn: (value: T) => U): Failure<U> { return new Failure<U>(this._cause); }
  flatMap<U>(_fn: (value: T) => TryLike<U>): Failure<U> { return new Failure<U>(this._cause); }
  filter(_predicate: (value: T) => boolean, _message?: string): Failure<T> { return this; }

  recover<U>(fn: (cause: unknown) => U): TryLike<U> { return Try.of(() => fn(this._cause)); }
  recoverWith<U>(fn: (cause: unknown) => TryLike<U>): TryLike<U> {
    try { return fn(this._cause); } catch (e) { return new Failure<U>(e); }
  }

  tap(_onSuccess?: (value: T) => void, onFailure?: (cause: unknown) => void): TryLike<T> {
    try { onFailure?.(this._cause); } catch { /* ignore tap errors */ }
    return this;
  }

  fold<U>(_onSuccess: (value: T) => U, onFailure: (cause: unknown) => U): U { return onFailure(this._cause); }
  toArray(): T[] { return []; }
  toNullable(): null { return null; }
}

export const Try = {
  /**
   * Execute `fn` and wrap the result in Success, or capture the thrown exception in Failure.
   *
   * @example
   * Try.of(() => JSON.parse('{"a":1}')).get()  // { a: 1 }
   * Try.of(() => JSON.parse('bad json')).isFailure()  // true
   */
  of<T>(fn: () => T): TryLike<T> {
    try { return new Success(fn()); }
    catch (e) { return new Failure<T>(e); }
  },

  /**
   * Wrap an already-computed value as Success.
   */
  success<T>(value: T): Success<T> { return new Success(value); },

  /**
   * Wrap an already-known failure as Failure.
   */
  failure<T = never>(cause: unknown): Failure<T> { return new Failure<T>(cause); },

  /**
   * Execute an async function and wrap the result.
   * Returns a Promise<TryLike<T>> — never rejects.
   *
   * @example
   * const t = await Try.ofAsync(async () => fetchData(url));
   * if (t.isSuccess()) console.log(t.get());
   */
  async ofAsync<T>(fn: () => Promise<T>): Promise<TryLike<T>> {
    try { return new Success(await fn()); }
    catch (e) { return new Failure<T>(e); }
  },

  /**
   * Collect multiple Try values: returns Success([values]) if ALL succeed,
   * or the first Failure encountered.
   *
   * @example
   * Try.all([Try.of(() => 1), Try.of(() => 2)]).get() // [1, 2]
   */
  all<T extends readonly TryLike<unknown>[]>(
    tries: T
  ): TryLike<{ [K in keyof T]: T[K] extends TryLike<infer U> ? U : never }> {
    const values: unknown[] = [];
    for (const t of tries) {
      if (t.isFailure()) return t as Failure<never>;
      values.push(t.get());
    }
    return new Success(values as { [K in keyof T]: T[K] extends TryLike<infer U> ? U : never });
  },
} as const;
