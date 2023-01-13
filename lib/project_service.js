const cdk = require("aws-cdk-lib");
const { Construct } = require("constructs");
const { AttributeType, Table } = require("aws-cdk-lib/aws-dynamodb");
const { Policy, PolicyStatement } = require("aws-cdk-lib/aws-iam");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");

class ProjectService extends Construct {
  constructor(scope, id, api, bucket, authorizer, secret, key) {
    super(scope, id);

    const handler = new lambda.Function(this, "ProjectHandler", {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("resources"),
      handler: "project/handler.main",
      timeout: cdk.Duration.seconds(20),
      environment: {
        BUCKET: bucket.bucketName,
        MAGIC: secret.secretValueFromJson(key).unsafeUnwrap()
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
        new Policy(this, `Webstudio-ProjectTablePermissions`, {
            statements: [projectTablePermissionPolicy],
        }),
    );

    bucket.grantReadWrite(handler);

    const root = api.root.addResource('project');

    const integration = new apigateway.LambdaIntegration(handler, {
      requestTemplates: { "application/json": '{ "statusCode": "200" }' }
    });

    root.addMethod("GET", integration, { authorizer });

    // Update project metadata, get project metadata, delete project
    const project = root.addResource("{id}");
    project.addMethod("POST", integration, { authorizer });
    project.addMethod("GET", integration, { authorizer });
    project.addMethod("DELETE", integration, { authorizer });

    // For editor content only
    const content = project.addResource("content");
    content.addMethod("POST", integration, { authorizer });
    content.addMethod("GET", integration, { authorizer });
    content.addMethod("DELETE", integration, { authorizer });

    // For editor metadata only
    const metadata = project.addResource("metadata");
    metadata.addMethod("POST", integration, { authorizer });
  }
}

module.exports = { ProjectService }