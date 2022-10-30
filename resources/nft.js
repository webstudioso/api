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
const S3 = new AWS.S3();

const bucketName = process.env.BUCKET;




const url = 'https://eth-rpc-mandala.aca-staging.network/';
let customHttpProvider = new ethers.providers.JsonRpcProvider(url);
let privateKey = '0x3ab6468f2465130c51946a5456b8e2d309be7af2f8afcd6823996d281c0990d0';

const abi = [
  {
    inputs: [],
    name: "name",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "tokenURI",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
		inputs: [
			{
				internalType: "uint256",
				name: "tokenId",
				type: "uint256"
			}
		],
		name: "uri",
		outputs: [
			{
				internalType: "string",
				name: "",
				type: "string"
			}
		],
		stateMutability: "view",
		type: "function"
	}
];




exports.main = async function(event, context) {
  try {
    var method = event.httpMethod;

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

    const signer = new ethers.Wallet(privateKey, customHttpProvider);
    const contract = new ethers.Contract(address,abi,signer);

    const IERC721 = '0x80ac58cd';
    const IERC1155 = '0xd9b67a26';
    const isERC721 = await contract.supportsInterface(IERC721);
    // const isERC1155 = await contract.supportsInterface(IERC1155);
    let tokenUri;
    // if (isERC1155) {
    //   tokenUri = await contract.uri(tokenId);
    if (isERC721) {
      tokenUri = await contract.tokenURI(tokenId);
    } else {
      // Not supported
      tokenUri = await contract.uri(tokenId);
    }
//   console.log('DOS');
//   // const tokenURI = await contract.tokenURI(tokenId);
  const nameQuery = contract.name();
  const symbolQuery = contract.symbol();
  const metadataQuery = axios.get(tokenUri);

  const queries = await Promise.all([nameQuery, symbolQuery, metadataQuery]);
  const nft = {
    token_id: tokenId,
    token_uri: tokenUri,
    name: queries[0],
    symbol: queries[1],
    token_address: address,
    metadata: queries[2]?.data,
    type: isERC721 ? 'ERC721' : 'ERC1155'
  }


console.log('TRES');
  console.log(JSON.stringify(nft))

    // We only accept GET for now
    return {
      statusCode: 200,
      headers: {},
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
