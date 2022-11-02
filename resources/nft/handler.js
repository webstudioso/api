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

const ERC165ABI = require('../abi/ERC165.json');
const ERC721ABI = require('../abi/ERC721.json');
const ERC1155ABI = require('../abi/ERC1155.json');
const chainMapping = require('../mapping/chains.json');

const S3 = new AWS.S3();

const bucketName = process.env.BUCKET;




// const url = 'https://eth-rpc-mandala.aca-staging.network/';
let singatureHash = '0x3ab6468f2465130c51946a5456b8e2d309be7af2f8afcd6823996d281c0990d0';

exports.main = async function(event, context) {
  try {
    console.log(JSON.stringify(event));
    // var method = event.httpMethod;
    let contract;

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
    const tokenId = event['pathParameters']['token_id'];
    const queryParams = event["queryStringParameters"] || {};
    const wallet = queryParams['owner_of'];
    const chain = queryParams['chain'];

    const targetChainUrl = chainMapping[chain] || chainMapping["1"];
    let customHttpProvider = new ethers.providers.JsonRpcProvider(targetChainUrl);
  
    const signer = new ethers.Wallet(singatureHash, customHttpProvider);
    contract = new ethers.Contract(address, ERC165ABI, signer);

    const IERC721 = '0x80ac58cd';
    // const IERC1155 = '0xd9b67a26';
    const isERC721 = await contract.supportsInterface(IERC721);
    // const isERC1155 = await contract.supportsInterface(IERC1155);
    let tokenUri, ownerQuery, amountQuery;
    // if (isERC1155) {
    //   tokenUri = await contract.uri(tokenId);
    if (isERC721) {
      contract = new ethers.Contract(address, ERC721ABI, signer);
      tokenUri = await contract.tokenURI(tokenId);
      ownerQuery = contract.ownerOf(tokenId);
      amountQuery = new Promise((resolve) => resolve(1));
    } else {
      // Not supported
      contract = new ethers.Contract(address, ERC1155ABI, signer);
      tokenUri = await contract.uri(tokenId);
      ownerQuery = new Promise((resolve) => resolve(wallet));
      amountQuery = contract.balanceOf(wallet, tokenId);
    }
//   console.log('DOS');
//   // const tokenURI = await contract.tokenURI(tokenId);
  const nameQuery = contract.name();
  const symbolQuery = contract.symbol();
  const metadataQuery = axios.get(tokenUri);

  const queries = await Promise.all([nameQuery, symbolQuery, metadataQuery, ownerQuery, amountQuery]);
  const nft = {
    token_id: tokenId,
    token_uri: tokenUri,
    name: queries[0],
    symbol: queries[1],
    token_address: address,
    metadata: queries[2]?.data,
    owner_of: queries[3],
    amount: parseInt(queries[4]),
    contract_type: isERC721 ? 'ERC721' : 'ERC1155',
    chain
  }


console.log('TRES');
  console.log(JSON.stringify(nft))

    // We only accept GET for now
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers" : "Content-Type",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
      },
      body: JSON.stringify(nft)
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
