const resolves = Symbol('@@monad/resolves');
const resolvesTo = Symbol('@@monad/resolves-to');

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

  [resolvesTo]() {
    return this.__val;
  }

  map(onResolve, onReject) {
    onReject = onReject || Monad.of.bind(Monad);
    const didResolve = this[resolves]();
    try {
      const value = (didResolve ? onResolve : onReject)(this[resolvesTo]());
      return value instanceof Monad ? value : Identity.of(value);
    } catch (e) {
      return Either.left(e);
    }
  }

  pass(onDone) {
    const onResolve = value => onDone(value, true);
    const onReject = value => onDone(value, false);
    return this.map(onResolve, onReject);
  }

  toString() {
    return `<${this.$$name}(${this[resolvesTo]()})>`;
  }

  toPromise() {
    return new Promise((resolve, reject) => this.map(resolve, reject));
  }
}

Monad.resolves = resolves;
Monad.resolvesTo = resolvesTo;
Monad.prototype.$$name = 'Negation';

const monad = (resolver, name) => {
  const cls = class extends Monad {
    [Monad.resolves]() {
      return resolver(this.__val);
    }
  };
  cls.prototype.$$name = name;
  return cls;
};

const Identity = monad(() => true, 'Identity');
const Maybe = class extends monad(value =>
  value !== null && value !== undefined, 'Maybe') {
  [resolvesTo]() {
    if (this.__val === undefined) return null;
    return this.__val;
  }
};
const EMPTY = Symbol('empty');
const Either = class extends monad(({ left, right }) =>
  left === EMPTY, 'Either') {
  static of(left, right) {
    return Reflect.construct(this, [{ left, right }]);
  }

  static wrap(func) {
    try {
      return this.right(func());
    } catch (e) {
      return this.left(e);
    }
  }

  static left(value) {
    return this.of(value);
  }

  static right(value) {
    return this.of(EMPTY, value);
  }

  [resolvesTo]() {
    if (this.__val.left !== EMPTY) return this.__val.left;
    return this.__val.right;
  }
};
const Async = class extends monad(value => value instanceof Promise, 'Async') {
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

const do_ = gen => {
  const it = gen();
  let ret;
  const iterate = run => {
    try {
      ret = run && ('e' in run) ? it.throw(run.e) : it.next(run && run.v);
    } catch (e) {
      return Either.left(e);
    }

    if (!ret.done) {
      if (ret.value instanceof Monad) {
        return ret.value.map(v => iterate({ v }),
                             e => iterate({ e }));
      } else {
        return Either.left(new Error('Do not yield non-monads'));
      }
    }

    return ret.value instanceof Monad ? ret.value : Identity.of(ret.value);
  };

  return iterate();
};

module.exports = {
  Monad,
  Identity,
  Maybe,
  Either,
  Async,
  monad,
  do_,
};
