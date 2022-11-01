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
const ethers = require('ethers');
const axios = require('axios');

const chainMapping = require('../mapping/chains.json');


exports.main = async function(event, context) {
  try {
    console.log(JSON.stringify(event));
    // var method = event.httpMethod;


    // if (method === "GET") {
    //   if (event.path === "/") {
    //     const data = await S3.listObjectsV2({ Bucket: bucketName }).promise();
    //     var body = {
    //       widgets: data.Contents.map(function(e) { return e.Key })
    //     };
    //     return {
    //       statusCode: 200,
    //       headers: {},
    //       body: JSON.stringify(body)
    //     };
    //   }
    // }

    const address = event['pathParameters']['address'];

    const queryParams = event["queryStringParameters"] || {}
    const chain = queryParams['chain'] || '1';
    // const chain = event?.queryStringParameters['chain'];
    const targetChainUrl = chainMapping[chain];
    const options = {
        "jsonrpc": "2.0",
        "method": "eth_getBalance",
        "params": [address, "latest"],
        "id": 1
    }
    const response = await axios.post(targetChainUrl, options);
    const value = response?.data?.result;
    const balance = {
        balance: parseInt(value)
    }

    // We only accept GET for now
    return {
      statusCode: 200,
      headers: {},
      body: JSON.stringify(balance)
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
