const struct = file => require(`./src/structures/${file}`);

module.exports = {
  YouTube: struct('YouTube'),
  version: require('./package.json').version
}