/* 
This code uses callbacks to handle asynchronous function responses.
It currently demonstrates using an async-await pattern. 
AWS supports both the async-await and promises patterns.
For more information, see the following: 
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/calling-services-asynchronously.html
https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html 
*/
const AWS = require('aws-sdk');
const axios = require('axios');

// Data extracted from
// https://chainid.network/chains.json
// https://api.llama.fi/chains
const chains = require('../data/chains.json');


exports.main = async function(event, context) {
  try {

    const queryParams = event["queryStringParameters"] || {}
    const typeQuery = queryParams['type'];
    let response;

    if (typeQuery) {
      response = chains.filter((network) => {
            if (typeQuery === 'testnet') {
                return  network?.name?.toLowerCase().includes('test') || 
                        network?.title?.toLowerCase().includes('test') || 
                        network?.network?.toLowerCase().includes('test')
            } else if (typeQuery === 'mainnet') {
                return  !network?.name?.toLowerCase().includes('test') &&
                        !network?.title?.toLowerCase().includes('test') && 
                        !network?.network?.toLowerCase().includes('test')
            }
        })
    }
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify(response)
    };
  } catch(error) {
    var body = error.stack || JSON.stringify(error, null, 2);
    return {
      statusCode: 400,
        headers: {},
        body: JSON.stringify(body)
    }
  }
}
