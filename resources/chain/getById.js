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
    const chainsUrl = 'https://chainid.network/chains.json';
    const chainsTlv = 'https://api.llama.fi/chains';
    // var method = event.httpMethod;

    const urlQuery = axios.get(chainsUrl);
    const queries = await Promise.all([urlQuery]);
    let networks = queries[0].data;
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

    // const address = event['pathParameters']['address'];

    let chainId = parseInt(event['pathParameters']['chain_id']);

    const foundNetworks = networks.filter((network) => network.chainId === chainId);

    networks = foundNetworks.map((network) => {
      let name;
      if (network.title) {
          name = network.title.split(' ')[0].toLowerCase();
      } else {
          name = network.name.split(' ')[0].toLowerCase();
      }
      network.imageUrl = `https://defillama.com/_next/image?url=%2Fchain-icons%2Frsz_${name}.jpg&w=48&q=75`;
      return network;
    })

    // We only accept GET for now
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify(networks.length > 0 ? networks[0] : {})
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
