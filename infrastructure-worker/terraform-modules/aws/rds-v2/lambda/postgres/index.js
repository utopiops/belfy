const { Client } = require('pg')
const host = process.env.databaseHost

exports.handler = async (event, context) => {

  var result
  try {
    var { statement, username, password, database } = event;
    var connection = new Client({
      host: host,
      user: username,
      password: password,
      database: database
    });
    connection.connect()
    const results = await connection.query(statement)
    result = {
      engine: 'postgres',
      command: results.command,
      result: results.rows
    };
  } catch (e) {
    result = {
      error: {
        engine: 'postgres',
        message: e.message,
        stack: e.stack
      }
    };
  } finally {
    connection.end();
  }
  return result;
}