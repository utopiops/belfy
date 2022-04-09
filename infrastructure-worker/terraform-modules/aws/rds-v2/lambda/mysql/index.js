var mysql = require('mysql2/promise')
const host = process.env.databaseHost

exports.handler = async (event) => {

  var result
  try {
    var { statement, username, password, database } = event;
    console.log(event)
    var connection = await mysql.createConnection({
      host: host,
      user: username,
      password: password,
      database: database
    });
    const [rows, fields] = await connection.query(statement);
    result = {
      engine: 'mysql',
      result: rows,
      fields
    };
  } catch (e) {
    result = {
      error: {
        engine: 'mysql',
        message: e.message,
        stack: e.stack
      }
    };
  } finally {
    if (connection) { connection.end(); }
  }
  return result;
}