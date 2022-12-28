const AWS = require("aws-sdk");

const projectDB = new AWS.DynamoDB.DocumentClient();

exports.main = async (event, context) => {
    const TABLE= 'Projects'
    let body;
    let statusCode = 200;
    const referer = event?.headers?.Referer ? event?.headers?.Referer : 'https://dappify.com';
    console.log(referer);
    const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Headers" : "Origin,X-Requested-With,Content-Type,Accept",
        "Access-Control-Allow-Origin": referer.replace(/\/$/,''),
        "Access-Control-Allow-Credentials": true
    };
    // if (event?.headers?.Referer) {
    //     headers["Access-Control-Allow-Origin"] = event.headers.Referer;
    // } else {
    //     // No referer
    // }

    console.log(JSON.stringify(event));
    let path = event.resource;
    let httpMethod = event.httpMethod;
    let route = httpMethod.concat(' ').concat(path);

    try {
        switch (route) {

            case "GET /project":
                const response = await projectDB
                    .query({
                        TableName: TABLE,
                        IndexName: "OwnerIndex",
                        KeyConditionExpression: "o = :o",
                        ExpressionAttributeValues: {
                            ":o": event.queryStringParameters.owner
                        }
                    })
                    .promise();
                body = response?.Items?.map((item) => {
                    return {
                        id: item.i,
                        owner: item.o,
                        subdomain: item.s,
                        domain: item.d,
                        metadata: item.m,
                        plan: item.p,
                        name: item.n
                    }
                });
                break;
            case "GET /project/{id}":
                const item = await projectDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        }
                    })
                    .promise();
                body = item ? {
                    id: item.Item.i,
                    owner: item.Item.o,
                    subdomain: item.Item.s,
                    domain: item.Item.d,
                    metadata: item.Item.m,
                    plan: item.Item.p,
                    name: item.Item.n
                } : { };
                break;
            case "POST /project/{id}":
                let bodyJSON = JSON.parse(event.body);
                await projectDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set s = :s, o = :o, d = :d, m = :m, p = :p, n = :n",
                        ExpressionAttributeValues: {
                            ":s": bodyJSON.subdomain,
                            ":o": bodyJSON.owner,
                            ":d": bodyJSON.domain,
                            ":m": bodyJSON.metadata,
                            ":p": bodyJSON.plan,
                            ":n": bodyJSON.name
                        }
                    })
                    .promise();
                body = `Update item ${event.pathParameters.id}`;
                break;
            case "DELETE /project/{id}":
                await projectDB
                    .delete({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
                break;


                
            case "GET /project/{id}/content":
                const data = await projectDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        }
                    })
                    .promise();
                body = data?.Item?.c;
                break;
            case "POST /project/{id}/content":
                let requestJSON = JSON.parse(event.body);
                await projectDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c",
                        ExpressionAttributeValues: {
                            ":c": requestJSON
                        }
                    })
                    .promise();
                body = `Updated project content ${requestJSON.id}`;
                break;
            case "DELETE /project/{id}/content":
                await projectDB
                    .update({
                        TableName: TABLE,
                        Key: {
                            i: event.pathParameters.id
                        },
                        UpdateExpression: "set c = :c",
                        ExpressionAttributeValues: {
                            ":c": null
                        }
                    })
                    .promise();
                body = `Deleted project content ${event.pathParameters.id}`;
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