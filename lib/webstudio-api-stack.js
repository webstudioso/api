const { Stack } = require('aws-cdk-lib');
const s3 = require("aws-cdk-lib/aws-s3");
const api_service = require('../lib/api_service');
const project_service = require('../lib/project_service');
const route_service = require('../lib/route_service');
const authorizer_service = require('../lib/authorizer_service');
const secrets_manager = require("aws-cdk-lib/aws-secretsmanager");

const StackProps = { 
  env: { 
    account: process.env.AWS_ACCOUNT, 
    region: process.env.AWS_REGION
}}

class WebstudioApiStack extends Stack {
  /**
   *
   * @param {Construct} scope
   * @param {string} id
   * @param {StackProps=} props
   */
  constructor(scope, id, props) {
    super(scope, id, StackProps);    
    
    const key = "APIKey";
    const secret = secrets_manager.Secret.fromSecretNameV2(this, key, key);

    // Infra
    const api = new api_service.APIService(this, 'API');
    const bucket = new s3.Bucket(this, "api");
  
    // Inject authorizer in endpoints that need access control
    const authorizer = new authorizer_service.AuthorizerService(this, 'Authorizer', secret, key);

    // Endpoints
    new project_service.ProjectService(this, 'Project', api, bucket, authorizer, secret, key);
    new route_service.RouteService(this, 'Route', api, bucket, authorizer, secret, key);
  }
}

module.exports = { WebstudioApiStack }
