module.exports = function (api) {
  api.cache(true);
  return {
    // nativewind/babel returns { plugins: [...] } — it is a preset, not a plugin
    presets: ['babel-preset-expo', 'nativewind/babel'],
  };
};
