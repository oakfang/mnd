import test from 'ava';
import { Identity, Maybe, Async, Either } from '.';

test('Maybe basics', async t => {
  const just = await Maybe.of(1).asPromise();
  t.is(just, 1);
  try {
    await Maybe.of(null);
  } catch (v) {
    t.is(v, null);
  }
});

test('Either basics', async t => {
  const right = await Either.of(1).asPromise();
  t.is(right, 1);
  const e = new Error();
  try {
    await Either.of(e);
  } catch (v) {
    t.is(v, e);
  }
});

test('Async basics', async t => {
  const success = await Async.of(Promise.resolve(1)).asPromise();
  t.is(await success, 1);
  try {
    await Async.of(Promise.reject(1)).asPromise();
  } catch (v) {
    t.is(v, 1);
  }

  try {
    await Async.of(1).asPromise();
  } catch (v) {
    t.is(v, 1);
  }
});

test('Monadic chains', async t => {
  const prop = p => o => Maybe.of(o[p]);
  const value = await Identity.of({ a: { b: 'foo' } })
                              .map(prop('a'))
                              .map(prop('b'))
                              .map(prop('c'))
                              .map(prop('d'))
                              .map(prop('0'), () => 'bar').asPromise();
  t.is(value, 'bar');
});

test('Async monadic chains', async t => {
  const prop = p => o => Maybe.of(o[p]);
  const value = await Async.of(Promise.resolve({ a: { b: 'foo' } }))
                           .map(prop('a'))
                           .map(prop('b'))
                           .map(prop('c'))
                           .map(prop('d'))
                           .map(prop('0'), () => 'bar').asPromise();
  t.is(value, 'bar');
});
