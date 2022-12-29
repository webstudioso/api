const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const route53 = require("aws-cdk-lib/aws-route53");
const route53Targets = require("aws-cdk-lib/aws-route53-targets");
const acm = require("aws-cdk-lib/aws-certificatemanager");

class APIService extends Construct {
  constructor(scope, id) {
    super(scope, id);

    const rootDomain = process.env.ROOT_DOMAIN;
    const zone = route53.HostedZone.fromLookup(this, "baseZone", {
      domainName: rootDomain,
    });
  
    const api = new apigateway.RestApi(this, "nft-api", {
        restApiName: "Dappify",
        description: "No-code project builder API",
        domainName: {
          domainName: `api.${rootDomain}`,
          endpointType: apigateway.EndpointType.EDGE,
          certificate: acm.Certificate.fromCertificateArn(
            this,
            "api-cert",
            process.env.ACM_ARN
          )
        },
        deployOptions: {
          cachingEnabled: false,
          cacheClusterEnabled: false,
        },
        // 👇 set up CORS
        defaultCorsPreflightOptions: {
            allowHeaders: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
                'Origin',
                'x-requested-with',
                'Accept',
                'AuthorizeToken'
            ],
            allowMethods: [ "GET", "POST", "PUT", "OPTIONS" ],
            allowOrigins: [
              "https://localhost:3000",
              "https://studio.dev.dappify.com",
              "https://studio.dappify.com"
            ],
            allowCredentials: true,
        }
    });

    new route53.ARecord(this, "apiDNS", {
      zone: zone,
      recordName: "api",
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api)
      ),
    });

    return api;
  }
}

module.exports = { APIService }