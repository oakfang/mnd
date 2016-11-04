const resolves = Symbol('@@monad/resolves');

class Monad {
  constructor(value) {
    this.__val = value;
  }

  static of(value) {
    return Reflect.construct(this, [value]);
  }

  [resolves]() {
    return false;
  }

  map(onResolve, onReject) {
    onReject = onReject || Monad.of.bind(Monad);
    const didResolve = this[resolves]();
    const value = (didResolve ? onResolve : onReject)(this.__val);
    return value instanceof Monad ? value : Identity.of(value);
  }

  asPromise() {
    return new Promise((resolve, reject) => this.map(resolve, reject));
  }
}

Monad.resolves = resolves;

const monad = resolver => class extends Monad {
  [Monad.resolves]() {
    return resolver(this.__val);
  }
};

const Identity = monad(() => true);
const Maybe = monad(value => value !== null && value !== undefined);
const Either = monad(value => !(value instanceof Error));
const Async = class extends monad(value => value instanceof Promise) {
  map(onResolve, onReject) {
    const didResolve = this[resolves]();
    if (!didResolve) return Async.of(Promise.reject(this.__val)).map(onResolve, onReject);
    onReject = onReject || Monad.of.bind(Monad);
    return Async.of(this.__val
      .then(onResolve)
      .catch(onReject)
      .then(value => (value instanceof Monad ?
        Promise[value[resolves]() ? 'resolve' : 'reject'](value.__val) :
        value)));
  }
};

module.exports = {
  Monad,
  Identity,
  Maybe,
  Either,
  Async,
  monad,
};
