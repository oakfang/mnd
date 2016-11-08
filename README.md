# mnd - JS monads for the masses
Bare-bones JS monads

## Why?
Because monads are a step on the path to personal enlightenment, achieved via
a shift in thought procedure.

## How?
Well, first, try `npm i -S mnd`. That's a great start.

## No, really. How?
Okay, so, I'm cheating. Monads have many "methods" attached to them, but we're
going to focus on two. Why? Because we're humanoids doing JS, not functional
automata doing Haskell. We want to do better, but we still want our code
readable for junior devs. But wait, before we talk about `mnd`, let's get one
thing front and center: you're already using monads in JS, at least one, which
is called - you guessed it - `Promise`. I'm not going to explain why, but read
on, you'll understand really soon.

First, a problem without monads:

```js
// What if we don't have a user?
// What if our user doesn't have an address?
// etc, etc...
function getUserState(user) {
  return user.address.country.state;
}

// Let's try again.
function getUserState(user) {
  return (
    user &&
    user.address &&
    user.address.country &&
    user.address.country.state
  ) || 'Default';
}

// Oh. This looks unwieldy. If only there was a better way.
```

Let's try this with monads.

```js
import { Maybe } from 'mnd';

// This returns an instance of the Maybe monad, holding the value of obj[p].
// prop :: string -> Object[string:T] -> Maybe T
const prop => p => obj => Maybe.of(obj[p]);

// getUserState :: User -> Maybe string
function getUserState(user) {
  return Maybe.of(user) // we might have a user
              .map(prop('address')) // if we do, they might have an address
              .map(prop('country')) // it they have, it might have country
              .map(prop('state')); // which in turn, might have a state
}

// User -> Identity string
getUserState(userObject)
  .map(
    state => state, // if the user has a state, let's get it
    () => 'default-value' // if the user doesn't have one, for whichever reason,
                         // let's use a default one
  );
```

Do you kind of see why `Promise` is a monad? So let's correlate the two APIs:

|            `Promise`          |                `mnd`               |
| ----------------------------- | ---------------------------------- |
| `Promise.resolve(x)`          | `Identity.of(x)`                   |
| `Promise.reject(y)`           | `Monad.of(x)`                      |
| `p.then(onResolve, onReject)` | `m.map(onResolve, onReject)`       |
| `p.catch(...)`                | **nothing, use the `onReject` cb** |

So, as you see, you create a monad of type `T` with `T.of(value)` (usually),
and you pass it forward using its `.map(onResolve, onReject)` method,
which returns one of three objects:
- If the object returned by onResolve/onReject (`x`) is not a monad, an
`Identity.of(x)` is returned.
- If `x` is a monad, it is returned.
- If whichever callback being called `throws`, the thrown object (`t`) is
returned as an `Either.left(t)` (see below).

Another monad method is `.pass`, which acts like `.map`, with one difference:
instead of accepting two callbacks, it accepts one callback, which it calls
regardless of the monad's resolution. The callback is called with the monad's
inner value, and its resolution state.
For example:

```js
const withDefault = defaultValue => (value, isResolved) =>
  isResolved ? value : defaultValue;

const o = { name: 'foo'};

Maybe.of(o.age).pass(withDefault(5)).map(console.log); // prints 5
```

## What's inside?
```js
import { Monad, Identity, Maybe, Either, Async, monad, do_ } from 'mnd';
import mtester from 'mnd/t';
```

### `Monad` - the never monad
- **Create:** `x => Monad.of(x)`
- **Resolves `map`:** never.

### `Identity` - I am X
- **Create:** `x => Identity.of(x)`
- **Resolves `map`:** always resolves with its internal value.

### `Maybe` - well... I might exist, but...
- **Create:** `x => Maybe.of(x)`
- **Resolves `map`:** resolves with internal value, as long as it's neither
`null` nor `undefined`.

### `Either` - either this worked, or it didn't
- **Create with intent to resolve:** `x => Either.right(x)`
- **Create with intent to reject:** `x => Either.left(x)`
- **Wrap a block with the Either monad:** `Either.wrap(() => /* unsafe code */).map(...)`

### `Async` - `Promise` to `mnd`
Wrapping a `Promise` (a native one!) with `Async.of` returns a monad
compatible with the rest of `mnd`'s monads.

### `monad(resolverFn) -> MonadType`
Use this function to create new monad types that are created using `.of(x)`
and are resolved into `.map` with original value `x`, based on passing original
value `x` to the `resolverFn`.

Example: `const Integer = monad(n => n >= 0)`

### `do_(generatorFunction)`
Basically, this is a shortcut. This is like [`co`](https://github.com/tj/co)
for monads, only it returns a monad, instead of a `Promise`.

## Monadic Tests
Because of reasons, you're probably going to want to test some of your monads.
`mnd` comes with a builtin monadic test helper under `mnd/t`.

Usage with `tape`:

```js
const test = require('tape');
const mtest = require('mnd/t')(test);
const { monadicFunction } = require('./app');

// if the monad is rejected, the test autofails
mtest('Test my monadic function', t =>
  monadicFunction(5).map(value => t.is(value, 32)));
```

## FAQ
- **How do I simply retrieve the internal value of a monad, without `.map`?**
- The same way you do that with a `Promise`, and for the same reason: you don't,
because it defeats the point.
- **All this is nice and well, but I'm gonna need some regular JS interop here.**
- Are promises cool? I hope you think they are. All monads have a `.toPromise()` method. Done.
