const { Stack } = require('aws-cdk-lib');
const s3 = require("aws-cdk-lib/aws-s3");
const nft_service = require('../lib/nft_service');
const wallet_service = require('../lib/wallet_service');
const api_service = require('../lib/api_service');
const chain_service = require('../lib/chain_service');
const project_service = require('../lib/project_service');

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

    const api = new api_service.APIService(this, 'API');
    const bucket = new s3.Bucket(this, "api");
    new chain_service.ChainService(this, 'Chain', api, bucket);
    new nft_service.NFTService(this, 'NFT', api, bucket);
    new wallet_service.WalletService(this, 'Wallet', api, bucket);
    new project_service.ProjectService(this, 'Project', api, bucket);

  }
}

module.exports = { DappifyApiStack }
