const commands = [
  require('./add'),
  require('./remove'),
  require('./list'),
  require('./test'),
  require('./help'),
];

function loadCommands(db, feedManager) {
  global._botDb = db;
  global._bot = { feedManager, db };
  return commands;
}

module.exports = loadCommands;
