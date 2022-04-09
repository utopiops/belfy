var sql = require('mssql');
const host = process.env.databaseHost;

exports.handler = async (event) => {

  var result
  try {
    var { statement, username, password, database } = event;
    console.log(event)
    await sql.connect({
      server: host,
      user: username,
      password: password,
      database: database,
      options: {
        encrypt: false
      }
    });
    const results = await sql.query(statement);
    result = {
      engine: 'sqlserver',
      result: results
    };
  } catch (e) {
    result = {
      error: {
        engine: 'sqlserver',
        message: e.message,
        stack: e.stack
      }
    };
  }
  return result;
}