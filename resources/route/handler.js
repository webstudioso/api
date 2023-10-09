const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
    DynamoDBDocument, GetCommand, PutCommand, DeleteCommand, QueryCommand, UpdateCommand, ScanCommand,
  } = require('@aws-sdk/lib-dynamodb');
const { CloudFrontClient, CreateInvalidationCommand } = require("@aws-sdk/client-cloudfront");
const { Magic } = require('@magic-sdk/admin');
const mAdmin = new Magic(process.env.MAGIC);

const routeDBClient = new DynamoDBClient();
const routeDB = DynamoDBDocument.from(routeDBClient);

const cloudFront = new CloudFrontClient();

const cloudfrontInvalidationParams = {
    DistributionId: process.env.AWS_CF_DISTRIBUTION_ID,
    InvalidationBatch: {
      CallerReference: String(new Date().getTime()),
      Paths: {
        Quantity: 1,
        Items: ['/']
      }
    }
  }

const getIssuer = (event) => {
    // Get issuer
    const DIDToken = event.headers.authorizetoken.substring(7);
    const issuer = mAdmin.token.getIssuer(DIDToken);
    console.log(`User ${issuer} request received`);
    return issuer;    
}

const invalidateCache = async () => {
    // For now invalidate *.webstudio.so cache on every publish
    // Needs to be done via queue request and notify in UI
    await cloudFront.send(new CreateInvalidationCommand(cloudfrontInvalidationParams)).promise();
    console.log(`Cache invalidation submitted for distribution ${JSON.stringify(cloudfrontInvalidationParams)}`);
}

exports.main = async (event, context) => {
    const TABLE= 'Routes'
    let body;
    let statusCode = 200;
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers" : "Origin,X-Requested-With,Content-Type,Accept",
        "Access-Control-Allow-Origin": event?.headers?.Referer?.replace(/\/$/,''),
        "Access-Control-Allow-Credentials": true
    };

    console.log(JSON.stringify(event));
    let path = event.resource;
    let httpMethod = event.httpMethod;
    let route = httpMethod.concat(' ').concat(path);

    try {
        switch (route) {
            case "GET /route/{id}":
                const data = await routeDB
                    .send(new GetCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        }
                    }))
                    .promise();
                body = data?.Item ? {
                    id: data.Item.i,
                    cid: data.Item.c,
                    ts: data.Item.t
                }: {};
                break;
            case "POST /route/{id}":
                let requestJSON = JSON.parse(event.body);
                await routeDB
                    .send(new UpdateCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c, o = :o, t = :t",
                        ConditionExpression: "attribute_not_exists(i) OR o = :o",
                        ExpressionAttributeValues: {
                            ":c": requestJSON.cid,
                            ":o": getIssuer(event),
                            ":t": Date.now()
                        }
                    }))
                    .promise();
                body = `Post item ${requestJSON.id}`;
                invalidateCache()
                break;
            case "DELETE /route/{id}":
                await routeDB
                    .send(new DeleteCommand({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        ConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": getIssuer(event)
                        }
                    }))
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
                invalidateCache()
                break;

            default:
                throw new Error(`Unsupported route: "${route}"`);
        }
    } catch (err) {
        console.log(err)
        statusCode = 400;
        body = err.message;
    } finally {
        console.log(body)
        body = JSON.stringify(body);
    }

    return {
        statusCode,
        body,
        headers
    };
};