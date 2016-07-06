/* eslint no-underscore-dangle: 0 */
import { assert, expect } from 'chai';
import Delta from './../../src/delta';
// import Hook from './../../src/hook';

const dist = 'facebook-shares';
const bin = 'my-content-id';
const bins = ['item one', 'item two', 'item three', 'item four'];

/**
 *
 * @param days
 * @returns {number}
 */
function getDays(days) {
  return (new Date().getTime() + ((60 * 60 * 24 * 1000) * days));
}

/**
 * Gets a delta an increments it
 * @param _bin
 * @param by
 * @returns {Promise.<TResult>}
 */
function increment(_bin, by = 1, cb) {
  return Hook
    .get(dist)
    .then(delta => {
      delta.incr({
        item: _bin,
        by,
      }).then(cb);
    });
}

describe('trend', () => {
  it('should create a new delta instance', () => {
    return Hook.create({
      name: dist,
      time: getDays(14),
    }).then(_delta => {
      expect(_delta instanceof Delta).to.equal(true);
      return Promise.resolve();
    });
  });

  it('should return a existing delta instance', () => {
    return Hook
      .get(dist)
      .then(_delta => {
        expect(_delta instanceof Delta).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should reject create if no options provided', () => {
    return Hook
      .create()
      .then()
      .catch(err => {
        expect(err instanceof Error).to.equal(true);
        expect(err.message.includes('Valid options object is required')).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should reject create if no name is provided', () => {
    return Hook
      .create({ foo: 'bar' })
      .then()
      .catch(err => {
        expect(err instanceof Error).to.equal(true);
        expect(err.message.includes('Missing required option')).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should reject create if no time is provided', () => {
    return Hook
      .create({ name: 'bar' })
      .then()
      .catch(err => {
        expect(err instanceof Error).to.equal(true);
        expect(err.message.includes('Missing required option')).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should reject incr if no options provided', () => {
    return Hook
      .get(dist)
      .then(delta => delta.incr())
      .catch(err => {
        expect(err instanceof Error).to.equal(true);
        expect(err.message.includes('Invalid options')).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should reject incr if no item is provided', () => {
    return Hook
      .get(dist)
      .then(delta => {
        return delta.incr({
          foo: 'bar',
        });
      })
      .catch(err => {
        expect(err instanceof Error).to.equal(true);
        expect(err.message.includes('Invalid item specified')).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should reject on not finding a delta instance', () => {
    return Hook
      .get('xyz_abc')
      .then()
      .catch(err => {
        expect(err instanceof Error).to.equal(true);
        expect(err.message.includes('does not exist')).to.equal(true);
        return Promise.resolve();
      });
  });

  it('should increment several bins in the distribution', done => {
    let count = 0;
    const run = idx => {
      if (idx < bins.length) {
        increment(bins[idx], 1, () => {
          run(++count);
        });
      } else {
        done();
      }
    };
    run(0);
  });

  it('should fetch all items in a distribution', () => {
    return Hook
      .get(dist)
      .then(_delta => _delta.fetch())
      .then(results => {
        console.dir(results);
        expect(typeof results).to.equal(typeof []);
        expect(results.length).to.equal(4);
        return Promise.resolve();
      });
  });

  it('should fetch a specific number of items in a distribution', () => {
    return Hook
      .get(dist)
      .then(_delta => _delta.fetch({ limit: 2 }))
      .then(results => {
        console.dir(results);
        expect(typeof results).to.equal(typeof []);
        expect(results.length).to.equal(2);
        return Promise.resolve();
      });
  });

  it('should fetch a specific item in a distribution', () => {
    const randBin = bins[Math.floor(Math.random() * bins.length)];
    return Hook
      .get(dist)
      .then(_delta => _delta.fetch({ item: randBin }))
      .then(results => {
        console.dir(results);
        expect(results[0].item).to.equal(randBin);
        expect(results.length).to.equal(1);
        return Promise.resolve();
      });
  });

  it('should return the most trending item', (done) => {
    const randBin = bins[2];
    increment(randBin, 12, () => {
      return Hook
        .get(dist)
        .then(_delta => _delta.fetch({ limit: 1 }))
        .then(results => {
          console.dir(results);
          expect(results[0].item).to.equal(randBin);
          expect(results.length).to.equal(1);
          return done();
        });
    });
  });

  // it('Should extend redibox hook class and provide an emitter', (done) => {
  //   const hook = new Hook();
  //   const protoName = Object.getPrototypeOf(Hook).name;
  //   assert.equal(protoName, 'BaseHook', `Hook should extend 'Hook' but it extends '${protoName}'`);
  //   assert.isDefined(hook.on);
  //   assert.isDefined(hook.emit);
  //   done();
  // });
  //
  // it('Should extend redibox BaseHook class and provide a name property', (done) => {
  //   const hook = new Hook();
  //   assert.isDefined(hook.name);
  //   assert.equal(global.HOOK_NAME, hook.name);
  //   done();
  // });
  //
  // it(`Should mount to core.${global.HOOK_NAME}`, (done) => {
  //   const config = { hooks: {} };
  //   config.hooks[global.HOOK_NAME] = Hook;
  //   const redibox = new RediBox(config, () => {
  //     assert.isTrue(redibox.hooks.hasOwnProperty(global.HOOK_NAME));
  //     redibox.disconnect();
  //     done();
  //   });
  //   redibox.on('error', (e) => {
  //     console.error(e);
  //   });
  // });
});
