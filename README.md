[![Coverage](https://coveralls.io/repos/github/redibox/trend/badge.svg?branch=master)](https://coveralls.io/github/redibox/trend?branch=master)
![Downloads](https://img.shields.io/npm/dt/redibox-hook-cache.svg)
[![npm version](https://img.shields.io/npm/v/redibox-hook-cache.svg)](https://www.npmjs.com/package/redibox-hook-trend)
[![dependencies](https://img.shields.io/david/redibox/trend.svg)](https://david-dm.org/redibox/trend)
[![build](https://travis-ci.org/redibox/trend.svg)](https://travis-ci.org/redibox/trend)
[![License](https://img.shields.io/npm/l/redibox-hook-trend.svg)](/LICENSE)

## RediBox Trending Hook

This is a scalable trending hook designed to track temporal trends in non-stationary categorical distributions. It uses [forget-table](https://github.com/bitly/forgettable/) style data structures which decay observations over time. Using a ratio of two such sets decaying over different lifetimes, it picks up on changes to recent dynamics in your observations, whilst forgetting historical data responsibly. The technique is closely related to exponential moving average (EMA) ratios used for detecting trends in financial data.

Trends are encapsulated by a construct named Delta. A Delta consists of two sets of counters, each of which implements exponential time decay of the form:

![equation](http://latex.codecogs.com/gif.latex?X_t_1%3DX_t_0%5Ctimes%7Be%5E%7B-%5Clambda%5Ctimes%7Bt%7D%7D%7D)

Where the inverse of the _decay rate_ (lambda) is the mean lifetime of an observation in the set. By normalising such a set by a set with half the decay rate, we obtain a trending score for each category in a distribution. This score expresses the change in the rate of observations of a category over the lifetime of the set, as a proportion in the range 0..1.

This implementation removes the need for manually sliding time windows or explicitly maintaining rolling counts, as observations naturally decay away over time. It's designed for heavy writes and sparse reads, as it implements decay at read time.

Each set is implemented as a redis `sorted set`, and keys are scrubbed when a count is decayed to near zero, providing storage efficiency.

This hook handles distributions with upto around 10<sup>6</sup> active categories, receiving hundreds of writes per second, without much fuss. Its scalability is dependent on your redis deployment.


### Installation

This is a hook for [RediBox](https://github.com/redibox/core) so you'll need that first.
Then it's as simple as:
 ```shell
 npm i redibox-hook-trend --save
 ```

RediBox will automatically load the hook for you.

### Usage

The examples below assume `Trend` as a reference to `RediBox.hooks.trend`

We also use `trend` as a easier term for `distribution` and `item` instead of `bin`.

#### Create a new trend (distribution)

```js
Trend.create({
  // the name of this trend
  name: 'kittens',
  // life time of this trend
  time: 1209600,  // 14 days
}).then(kittensTrend => {
  // do things with your new trend
});
```

#### Get an existing trend (distribution)

```js
Trend.get('kittens').then(kittensTrend => {
  // do things with your kittens trend
});
```

#### Check if a trend exists

```js
Trend.exists('kittens').then(bool => {
  // bool is truthy if trend exists
});
```

#### Incrementing a trend item (bin)

```js
kittensTrend.incr({
  item: 'fluffball', // can even be json if needed
  by: 1,
}).then(() => {
  // all done
});
```

#### Fetch all items in a trend

These are pre-sorted highest score descending.

```js
kittensTrend.fetch().then((items) => {
  // console.dir(items);
});
```

#### Fetch a specific item in a trend

```js
kittensTrend.fetch({
  item: 'fluffball'
}).then((items) => {
  // console.dir(items);
  // [ { item: 'fluffball', score: 0.9999999999882863 } ]
});
```


#### Fetch a specific number of items in a trend

E.g. top 5 kittens in kittensTrend

```js
kittensTrend.fetch({
  limit: 5
,}).then((items) => {
  // console.dir(items);
  // [ { item: 'fluffball', score: 0.9999999999882863 } ]
  // ...
  // ...
});
```


## Contributing

Full contributing guidelines are to be written, however please ensure you follow these points when sending in PRs:

- Ensure no lint warnings occur via `npm run lint`.
- Implement tests for new features / functionality.
- Ensure coverage remains above 90% and does not decrease.
- Use verbose logging throughout for ease of debugging issues, see core.js for example.
- New modules should follow the same format as the default modules / template.

**Note:** For debugging purposes you may want to enable verbose logging via the config:

```javascript
  new RediBox({
    log: {
      level: 'verbose'
    }
  });
```

## License

MIT
