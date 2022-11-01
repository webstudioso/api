const { Stack, Duration } = require('aws-cdk-lib');
const nft_service = require('../lib/nft_service');
const wallet_service = require('../lib/wallet_service');
const api_service = require('../lib/api_service');
// const sqs = require('aws-cdk-lib/aws-sqs');

const StackProps = { 
  env: { 
    account: process.env.AWS_ACCOUNT, 
    region: process.env.AWS_REGION
}}

class DappifyApiStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, StackProps);

    // The code that defines your stack goes here
    const api = new api_service.APIService(this, 'API');
    new nft_service.NFTService(this, 'NFT', api);
    new wallet_service.WalletService(this, 'Wallet', api);
    // example resource
    // const queue = new sqs.Queue(this, 'DappifyApiQueue', {
    //   visibilityTimeout: Duration.seconds(300)
    // });
  }
}

module.exports = { DappifyApiStack }
