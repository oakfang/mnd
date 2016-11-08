import test from 'ava';
import { Identity, Maybe, Async, Either, do_ } from '.';
import mtester from './t';

const mtest = mtester(() => test.cb);
const get = (o, p) => Maybe.of(o[p]);
const prop = p => o => Maybe.of(o[p]);
const withDefault = dv => (v, resolved) => resolved ? v : dv;

mtest('Maybe basics [just]', t => {
  const maybe = Maybe.of(1);
  t.is(maybe.toString(), '<Maybe(1)>');
  return maybe.map(just => t.is(just, 1));
});

mtest('Maybe basics [nothing:undefined]', t =>
  Maybe.of()
       .map(() => t.fail('Should reject'),
            n => t.is(n, null)));

mtest('Maybe basics [nothing:null]', t =>
  Maybe.of(null)
       .map(() => t.fail('Should reject'),
            n => t.is(n, null)));

mtest('Either basics [right]', t =>
  Either.right(1).map(v => t.is(v, 1)));

mtest('Either basics [left]', t =>
  Either.left(1).map(() => t.fail('should reject'),
                     v => t.is(v, 1)));

mtest('Either wrap [right]', t => Either.wrap(() => 5).map(v => t.is(v, 5)));

mtest('Either wrap [left]', t => Either.wrap(() => {
  throw new Error('meow?');
}).map(() => t.fail('Should have rejected'),
       e => t.is(e.message, 'meow?')));

mtest('Async basics [resolved]', t =>
  Async.of(Promise.resolve(1)).map(v => t.is(v, 1)));

mtest('Async basics [rejected]', t =>
  Async.of(Promise.reject(1)).map(() => t.fail('Should reject'),
                                  v => t.is(v, 1)));

mtest('Async basics [non-promise]', t =>
  Async.of(1).map(() => t.fail('Should reject'),
                  v => t.is(v, 1)));

mtest('Exception safety', t => Identity.of({})
                                       .map(o => o.x)
                                       .map(o => o.y)
                                       .map(o => o.z, () => 'foo')
                                       .map(v => t.is(v, 'foo')));

mtest('Monadic chains', t => Identity.of({ a: { b: 'foo' } })
                                     .map(prop('a'))
                                     .map(prop('b'))
                                     .map(prop('c'))
                                     .map(prop('d'))
                                     .map(prop('0'), () => 'bar')
                                     .map(v => t.is(v, 'bar')));

mtest('Async Monadic chains', t => Async.of(Promise.resolve({ a: { b: 'foo' } }))
                                        .map(prop('a'))
                                        .map(prop('b'))
                                        .map(prop('c'))
                                        .map(prop('d'))
                                        .map(prop('0'), () => 'bar')
                                        .map(v => t.is(v, 'bar')));

mtest('Monadic passes [reject]', t => Identity.of({
  a: {
    b: 'foo',
  },
})
.map(prop('a'))
.map(prop('b'))
.map(prop('c'))
.pass(withDefault('bar'))
.map(prop('0'))
.map(v => t.is(v, 'b')));

mtest('Monadic passes [resolve]', t => Identity.of({
  a: {
    b: 'foo',
  },
})
.map(prop('a'))
.map(prop('b'))
.pass(withDefault('bar'))
.map(prop('0'))
.map(v => t.is(v, 'f')));

mtest('do expression [fail]', t => do_(function* () {
  const o = { a: { b: 'foo' } };
  const a = yield get(o, 'a');
  const b = yield get(a, 'b');
  const c = yield get(b, 'c');
  return yield get(c, 'd');
}).map(prop('0'), () => 'bar').map(v => t.is(v, 'bar')));

mtest('do expression [bad]', t => do_(function* () {
  const o = { a: { b: 'foo' } };
  const a = yield get(o, 'a');
  return yield a.b;
}).map(prop('0'), e => e.message).map(v => t.is(v, 'Do not yield non-monads')));

mtest('do expression [good]', t => do_(function* () {
  const o = { a: { b: 'foo' } };
  const a = yield get(o, 'a');
  return get(a, 'b');
}).map(prop('0'), e => e.message).map(v => t.is(v, 'f')));

mtest('do expression [good:wrap]', t => do_(function* () {
  const o = { a: { b: 'foo' } };
  const a = yield get(o, 'a');
  return (yield get(a, 'b'))[0];
}).map(v => t.is(v, 'f')));

mtest('do expression [good:try]', t => do_(function* () {
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
}).map(prop('0'), e => e.message).map(v => t.is(v, 'b')));

test('monad.toPromise()', async t => t.is(await Maybe.of(1).toPromise(), 1));
