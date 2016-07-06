global.HOOK_NAME = 'schedule';
const Redibox = require('redibox').default;
const UserHook = require('./lib/hook').default;

global.some = {
  coolFunction(data) {
    console.log('COOL');
    return Promise.resolve();
  },
  unCoolFunc(data) {
    console.log('UNCOOL');
    return Promise.reject(new Error('Woops'));
  },
};

const config = {
  hooks: {}, schedule: {
    schedules: [
      {
        runs: 'some.coolFunction',
        data: { live: true },
        interval: 'every 5 seconds',
      },
      {
        runs: 'some.unCoolFunc',
        data: { live: true },
        interval: 'every 15 seconds',
      },
      {
        runs: 'some.doNotExist',
        data: { live: true },
        interval: 'every 5 seconds',
      },
    ],
  }, log: { level: 'info'},
};
config.hooks[global.HOOK_NAME] = UserHook;

const clusterConfig = {
  log: { level: 'info' },
  redis: {
    connectionTimeout: 2000,
    hosts: [
      {
        host: '127.0.0.1',
        port: 30001,
      },
      {
        host: '127.0.0.1',
        port: 30002,
      },
      {
        host: '127.0.0.1',
        port: 30003,
      },
      {
        host: '127.0.0.1',
        port: 30004,
      },
      {
        host: '127.0.0.1',
        port: 30005,
      },
      {
        host: '127.0.0.1',
        port: 30006,
      },
    ],
  },
  hooks: {},
};

clusterConfig.hooks[global.HOOK_NAME] = UserHook;

global.RediBox = new Redibox(config, () => {
  global.Hook = RediBox.hooks[global.HOOK_NAME];

});
