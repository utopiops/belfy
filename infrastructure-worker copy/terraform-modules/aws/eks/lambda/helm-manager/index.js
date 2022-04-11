const axios = require("axios");
const AWS = require("aws-sdk");

exports.handler = async function(event, context) {

  var result;
  try {
    var ssm = new AWS.SSM();
    var options = {
      Name: process.env.PARAM_NAME,
      WithDecryption: false
    };
    var data =  await ssm.getParameter(options).promise();
    var helmManagerUrl;
    helmManagerUrl = data.Parameter.Value;

    var { url, method, body } = event;
    url = 'http://' + data.Parameter.Value + url;
    const axiosConfig = {
      method: method,
      url: url,
      data: body
    };
    console.log(`axiosConfig`, JSON.stringify(axiosConfig, null, 2))
    
    const response = await axios(axiosConfig);
    result = {
        message: response.data
    };
    
  } catch (e) {
    result = {
      error: {
        message: e.message
      }
    };
  }

  return result;
}