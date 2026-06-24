import { Try, Success, Failure } from "../src/index.js";

describe("Try.of", () => {
  it("wraps successful computation in Success", () => {
    const t = Try.of(() => 42);
    expect(t.isSuccess()).toBe(true);
    expect(t.isFailure()).toBe(false);
    expect(t.get()).toBe(42);
  });

  it("wraps thrown exception in Failure", () => {
    const t = Try.of(() => { throw new Error("boom"); });
    expect(t.isFailure()).toBe(true);
    expect(t.isSuccess()).toBe(false);
    expect(() => t.get()).toThrow("boom");
  });

  it("captures exception from JSON.parse", () => {
    const t = Try.of(() => JSON.parse("bad json"));
    expect(t.isFailure()).toBe(true);
  });

  it("succeeds for valid JSON.parse", () => {
    const t = Try.of(() => JSON.parse('{"a":1}') as { a: number });
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toEqual({ a: 1 });
  });
});

describe("Try.success / Try.failure", () => {
  it("Try.success wraps value", () => {
    const t = Try.success(99);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toBe(99);
  });

  it("Try.failure wraps cause", () => {
    const err = new Error("oops");
    const t = Try.failure<number>(err);
    expect(t.isFailure()).toBe(true);
    expect(t.getCause()).toBe(err);
  });
});

describe("Success", () => {
  it("getOrElse returns value", () => {
    expect(Try.of(() => 5).getOrElse(0)).toBe(5);
  });

  it("getOrElseGet returns value without calling fn", () => {
    let called = false;
    const v = Try.of(() => 5).getOrElseGet(() => { called = true; return 0; });
    expect(v).toBe(5);
    expect(called).toBe(false);
  });

  it("getOrElseThrow returns value", () => {
    expect(Try.of(() => "hi").getOrElseThrow(() => new Error("x"))).toBe("hi");
  });

  it("getCause throws on Success", () => {
    expect(() => Try.success(1).getCause()).toThrow();
  });

  it("map transforms value", () => {
    const t = Try.of(() => 5).map(x => x * 2);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toBe(10);
  });

  it("map captures thrown exception", () => {
    const t = Try.of(() => "hello").map(s => { throw new Error("map error"); s; });
    expect(t.isFailure()).toBe(true);
  });

  it("flatMap with Success → Success", () => {
    const t = Try.of(() => 5).flatMap(x => Try.success(x + 1));
    expect(t.get()).toBe(6);
  });

  it("flatMap with fn returning Failure propagates", () => {
    const t = Try.of(() => 5).flatMap(() => Try.failure(new Error("inner")));
    expect(t.isFailure()).toBe(true);
  });

  it("flatMap captures thrown exception from fn", () => {
    const t = Try.of(() => 5).flatMap(() => { throw new Error("flatmap throw"); });
    expect(t.isFailure()).toBe(true);
  });

  it("filter passes when predicate is true", () => {
    const t = Try.of(() => 5).filter(x => x > 3);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toBe(5);
  });

  it("filter returns Failure when predicate is false", () => {
    const t = Try.of(() => 5).filter(x => x > 10);
    expect(t.isFailure()).toBe(true);
  });

  it("filter captures predicate throw as Failure", () => {
    const t = Try.of(() => 5).filter(() => { throw new Error("pred"); });
    expect(t.isFailure()).toBe(true);
  });

  it("recover on Success passes through", () => {
    const t = Try.of(() => 5).recover(() => 99);
    expect(t.get()).toBe(5);
  });

  it("recoverWith on Success passes through", () => {
    const t = Try.of(() => 5).recoverWith(() => Try.success(99));
    expect(t.get()).toBe(5);
  });

  it("tap calls onSuccess", () => {
    let seen: number | undefined;
    Try.of(() => 42).tap(v => { seen = v; });
    expect(seen).toBe(42);
  });

  it("tap does not call onFailure on Success", () => {
    let called = false;
    Try.of(() => 42).tap(undefined, () => { called = true; });
    expect(called).toBe(false);
  });

  it("fold applies onSuccess", () => {
    const r = Try.of(() => 5).fold(v => v * 10, () => -1);
    expect(r).toBe(50);
  });

  it("toArray returns [value]", () => {
    expect(Try.of(() => 7).toArray()).toEqual([7]);
  });

  it("toNullable returns value", () => {
    expect(Try.of(() => "x").toNullable()).toBe("x");
  });
});

describe("Failure", () => {
  const err = new Error("fail");

  it("get rethrows the cause", () => {
    expect(() => Try.failure(err).get()).toThrow(err);
  });

  it("getOrElse returns default", () => {
    expect(Try.failure(err).getOrElse(42)).toBe(42);
  });

  it("getOrElseGet calls fn with cause", () => {
    const t = Try.failure<number>(err);
    const r = t.getOrElseGet(e => (e as Error).message.length);
    expect(r).toBe(4); // "fail".length
  });

  it("getOrElseThrow throws fn(cause)", () => {
    const t = Try.failure<number>(err);
    expect(() => t.getOrElseThrow(e => new RangeError((e as Error).message))).toThrow(RangeError);
  });

  it("getCause returns the original error", () => {
    expect(Try.failure(err).getCause()).toBe(err);
  });

  it("map propagates Failure", () => {
    const t = Try.failure<number>(err).map(x => x * 2);
    expect(t.isFailure()).toBe(true);
    expect((t as Failure<number>).getCause()).toBe(err);
  });

  it("flatMap propagates Failure", () => {
    const t = Try.failure<number>(err).flatMap(x => Try.success(x + 1));
    expect(t.isFailure()).toBe(true);
  });

  it("filter propagates Failure unchanged", () => {
    const t = Try.failure<number>(err).filter(x => x > 0);
    expect(t.isFailure()).toBe(true);
  });

  it("recover converts Failure to Success", () => {
    const t = Try.of<number>(() => { throw new Error("x"); }).recover(() => 99);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toBe(99);
  });

  it("recover captures exception in fn as new Failure", () => {
    const t = Try.of<number>(() => { throw new Error("x"); }).recover(() => { throw new Error("recover fail"); });
    expect(t.isFailure()).toBe(true);
    expect((t.getCause() as Error).message).toBe("recover fail");
  });

  it("recoverWith returns fn(cause) result", () => {
    const t = Try.of<number>(() => { throw new Error("x"); }).recoverWith(() => Try.success(7));
    expect(t.get()).toBe(7);
  });

  it("recoverWith captures fn throw as Failure", () => {
    const t = Try.of<number>(() => { throw new Error("x"); }).recoverWith(() => { throw new Error("rw fail"); });
    expect(t.isFailure()).toBe(true);
  });

  it("tap calls onFailure", () => {
    let seen: unknown;
    Try.failure(err).tap(undefined, e => { seen = e; });
    expect(seen).toBe(err);
  });

  it("fold applies onFailure", () => {
    const r = Try.failure<number>(err).fold(() => 99, e => (e as Error).message);
    expect(r).toBe("fail");
  });

  it("toArray returns []", () => {
    expect(Try.failure(err).toArray()).toEqual([]);
  });

  it("toNullable returns null", () => {
    expect(Try.failure(err).toNullable()).toBeNull();
  });
});

describe("Try.ofAsync", () => {
  it("returns Success for resolved promise", async () => {
    const t = await Try.ofAsync(async () => 42);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toBe(42);
  });

  it("returns Failure for rejected promise", async () => {
    const t = await Try.ofAsync(async () => { throw new Error("async fail"); });
    expect(t.isFailure()).toBe(true);
    expect((t.getCause() as Error).message).toBe("async fail");
  });

  it("never rejects — always resolves to TryLike", async () => {
    await expect(Try.ofAsync(async () => { throw new Error("x"); })).resolves.toBeDefined();
  });
});

describe("Try.all", () => {
  it("returns Success with all values when all succeed", () => {
    const t = Try.all([Try.success(1), Try.success("hello"), Try.success(true)]);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toEqual([1, "hello", true]);
  });

  it("returns first Failure if any fail", () => {
    const err = new Error("bad");
    const t = Try.all([Try.success(1), Try.failure(err), Try.success(3)]);
    expect(t.isFailure()).toBe(true);
    expect(t.getCause()).toBe(err);
  });

  it("empty array returns Success([])", () => {
    const t = Try.all([]);
    expect(t.isSuccess()).toBe(true);
    expect(t.get()).toEqual([]);
  });
});

describe("instanceof guards", () => {
  it("Try.of success is instanceof Success", () => {
    expect(Try.of(() => 1)).toBeInstanceOf(Success);
  });

  it("Try.of failure is instanceof Failure", () => {
    expect(Try.of(() => { throw new Error(); })).toBeInstanceOf(Failure);
  });
});

describe("chaining — real-world patterns", () => {
  it("JSON parse → transform → recover chain", () => {
    const raw = "bad json";
    const name = Try.of(() => JSON.parse(raw) as { name: string })
      .map(obj => obj.name)
      .recover(() => "anonymous")
      .get();
    expect(name).toBe("anonymous");
  });

  it("deep chain: parse → validate → transform", () => {
    const r = Try.of(() => JSON.parse('{"age":"25"}') as { age: string })
      .map(obj => parseInt(obj.age, 10))
      .filter(age => age >= 0 && age < 150, "invalid age")
      .map(age => age + 1)
      .getOrElse(-1);
    expect(r).toBe(26);
  });

  it("async chain", async () => {
    const t = await Try.ofAsync(async () => {
      const n = 42;
      return n * 2;
    });
    const r = t.map(x => x + 1).getOrElse(0);
    expect(r).toBe(85);
  });
});
