const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
const {AttributeType, Table} = require("aws-cdk-lib/aws-dynamodb");
const {Policy, PolicyStatement} = require("aws-cdk-lib/aws-iam");

class ProjectService extends Construct {
  constructor(scope, id, api, bucket) {
    super(scope, id);

    const handler = new lambda.Function(this, "ProjectHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "project/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName
      }
    });

    const projectTable = new Table(this, `Project-Table`, {
      tableName: 'Projects',
      partitionKey: {
          name: 'i',
          type: AttributeType.STRING
      },
    });

    const gsi = projectTable.addGlobalSecondaryIndex({
      indexName: 'OwnerIndex',
      partitionKey: {name: 'o', type: AttributeType.STRING}
    });

    //Required permissions for Lambda function to interact with Customer table
    const projectTablePermissionPolicy = new PolicyStatement({
        actions: [
            "dynamodb:BatchGetItem",
            "dynamodb:GetItem",
            "dynamodb:Scan",
            "dynamodb:Query",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:UpdateItem",
            "dynamodb:DeleteItem"
        ],
        resources: [projectTable.tableArn,`${projectTable.tableArn}/index/*`]
    });
  
    //Attaching an inline policy to the role
    handler.role?.attachInlinePolicy(
        new Policy(this, `Dappify-ProjectTablePermissions`, {
            statements: [projectTablePermissionPolicy],
        }),
    );

    bucket.grantReadWrite(handler);

    const root = api.root.addResource('project');
    const baseInteg = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' },
      requestParameters: {
        'integration.request.querystring.owner': 'method.request.querystring.owner'
      }
    });

    root.addMethod("GET", baseInteg, {
      requestParameters: {
        'method.request.querystring.owner': true,
      }
    });

    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    // Update project metadata, get project metadata, delete project
    const project = root.addResource("{id}");
    project.addMethod("POST", integration);
    project.addMethod("GET", integration);
    project.addMethod("DELETE", integration);

    // For editor content only
    const content = project.addResource("content");
    content.addMethod("POST", integration);
    content.addMethod("GET", integration);
    content.addMethod("DELETE", integration);

  }
}

module.exports = { ProjectService }