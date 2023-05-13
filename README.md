 # Webstudio API
This API enables [Webstudio](https://webstudio.so) app store and retrieve data from projects and launch projects to IPFS. It is built using AWS CDK.

# Welcome to your CDK JavaScript project

This is a blank project for CDK development with JavaScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app. The build step is not required when using JavaScript.

## Useful commands

* `npm run test`         perform the jest unit tests
* `cdk deploy`           deploy this stack to your default AWS account/region
* `cdk diff`             compare deployed stack with current state
* `cdk synth`            emits the synthesized CloudFormation template

## Example

```
AWS_CF_DISTRIBUTION_ID=<DIST_ID> ROOT_DOMAIN=dev.webstudio.so AWS_ACCOUNT=<ACC_NUMBER> AWS_REGION=<REGION> ACM_ARN=<CERTIFICATE_ARN> cdk bootstrap --profile <PROFILE_NAME>
```

## Adding Custom Domains

1. Generate a Certificate with Certificate Manager
2. Clone CF Distribution and update certificate and domain
3. Invalidate Cache
4. Owner of domain must include certificate and domain routing in DNS

