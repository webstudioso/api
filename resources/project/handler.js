const AWS = require("aws-sdk");

const customerDB = new AWS.DynamoDB.DocumentClient();

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
            case "GET /project/{id}":
                const data = await customerDB
                    .get({
                        TableName: TABLE,
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                    .promise();
                body = data?.Item;
                break;
            case "POST /project/{id}":
                let requestJSON = JSON.parse(event.body);
                await customerDB
                    .put({
                        TableName: TABLE,
                        Item: requestJSON
                    })
                    .promise();
                body = `Post item ${requestJSON.id}`;
                break;
            case "DELETE /project/{id}":
                await customerDB
                    .delete({
                        TableName: TABLE,
                        Key: {
                            id: event.pathParameters.id
                        }
                    })
                    .promise();
                body = `Deleted item ${event.pathParameters.id}`;
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