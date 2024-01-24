const { fromInstanceMetadata } = require('@aws-sdk/credential-providers');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: 'us-east-1',
    credentials: fromInstanceMetadata({
        timeout: 3000,
        maxRetries: 4,
    }) });

async function fetchSecrets() {
    try {
        const mongoResponse = await ssmClient.send(new GetParameterCommand({ Name: '/bxcrd/prod/MONGODBURL', WithDecryption: true }));
        const jwtResponse = await ssmClient.send(new GetParameterCommand({ Name: '/bxcrd/prod/JWTSECRET', WithDecryption: true }));
        exports.MONGODBURL = mongoResponse.Parameter.Value;
        exports.JWTSECRET = jwtResponse.Parameter.Value;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

exports.fetchSecrets = fetchSecrets;
