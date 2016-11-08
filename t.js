const m = require('.');

module.exports = testFactory =>
  (description, monadFactory) =>
    testFactory()(description, t =>
      monadFactory(t)
      .map(v => m.Identity.of(v), t.fail)
      .map(t.end));
