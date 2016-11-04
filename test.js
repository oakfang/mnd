import test from 'ava';
import { Identity, Maybe, Async, Either, do_ } from '.';

test('Maybe basics', async t => {
  const maybe = Maybe.of(1);
  t.is(maybe.toString(), '<Maybe(1)>');
  const just = await maybe.toPromise();
  t.is(just, 1);
  try {
    await Maybe.of(null).toPromise();
  } catch (v) {
    t.is(v, null);
  }

  try {
    await Maybe.of().toPromise();
  } catch (v) {
    t.is(v, null);
  }
});

test('Either basics', async t => {
  const right = await Either.right(1).toPromise();
  t.is(right, 1);
  const e = new Error();
  try {
    await Either.left(e).toPromise();
  } catch (v) {
    t.is(v, e);
  }
});

test('Async basics', async t => {
  const success = await Async.of(Promise.resolve(1)).toPromise();
  t.is(await success, 1);
  try {
    await Async.of(Promise.reject(1)).toPromise();
  } catch (v) {
    t.is(v, 1);
  }

  try {
    await Async.of(1).toPromise();
  } catch (v) {
    t.is(v, 1);
  }
});

test('Exception safety', async t => {
  const value = await Identity.of({})
                              .map(o => o.x)
                              .map(o => o.y)
                              .map(o => o.z, () => 'foo').toPromise();
  t.is(value, 'foo');
});

test('Monadic chains', async t => {
  const prop = p => o => Maybe.of(o[p]);
  const value = await Identity.of({ a: { b: 'foo' } })
                              .map(prop('a'))
                              .map(prop('b'))
                              .map(prop('c'))
                              .map(prop('d'))
                              .map(prop('0'), () => 'bar').toPromise();
  t.is(value, 'bar');
});

test('Async monadic chains', async t => {
  const prop = p => o => Maybe.of(o[p]);
  const value = await Async.of(Promise.resolve({ a: { b: 'foo' } }))
                           .map(prop('a'))
                           .map(prop('b'))
                           .map(prop('c'))
                           .map(prop('d'))
                           .map(prop('0'), () => 'bar').toPromise();
  t.is(value, 'bar');
});

test('do expression [fail]', async t => {
  const get = (o, p) => Maybe.of(o[p]);
  const prop = p => o => Maybe.of(o[p]);
  const value = await do_(function* () {
    const o = { a: { b: 'foo' } };
    const a = yield get(o, 'a');
    const b = yield get(a, 'b');
    const c = yield get(b, 'c');
    return yield get(c, 'd');
  }).map(prop('0'), () => 'bar').toPromise();
  t.is(value, 'bar');
});

test('do expression [bad]', async t => {
  const get = (o, p) => Maybe.of(o[p]);
  const prop = p => o => Maybe.of(o[p]);
  const value = await do_(function* () {
    const o = { a: { b: 'foo' } };
    const a = yield get(o, 'a');
    return yield a.b;
  }).map(prop('0'), e => e.message).toPromise();
  t.is(value, 'Do not yield non-monads');
});

test('do expression [good]', async t => {
  const get = (o, p) => Maybe.of(o[p]);
  const prop = p => o => Maybe.of(o[p]);
  const value = await do_(function* () {
    const o = { a: { b: 'foo' } };
    const a = yield get(o, 'a');
    return get(a, 'b');
  }).map(prop('0'), e => e.message).toPromise();
  t.is(value, 'f');
});

test('do expression [good:wrap]', async t => {
  const get = (o, p) => Maybe.of(o[p]);
  const value = await do_(function* () {
    const o = { a: { b: 'foo' } };
    const a = yield get(o, 'a');
    return (yield get(a, 'b'))[0];
  }).toPromise();
  t.is(value, 'f');
});

test('do expression [good:try]', async t => {
  const get = (o, p) => Maybe.of(o[p]);
  const prop = p => o => Maybe.of(o[p]);
  const value = await do_(function* () {
    const o = { a: { b: 'foo' } };
    const a = yield get(o, 'a');
    const b = yield get(a, 'b');
    try {
      const c = yield get(b, 'c');
      const d = yield get(c, 'd');
      return yield get(d, 'e');
    } catch (e) {
      return 'bar';
    }
  }).map(prop('0'), e => e.message).toPromise();
  t.is(value, 'b');
});
