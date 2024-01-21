const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

const ssmClient = new SSMClient({ region: 'us-east-1' });

async function fetchSecrets() {
    try {
        const MONGODBURL = await ssmClient.send(new GetParameterCommand({ Name: '/bxcrd/prod/MONGODBURL', WithDecryption: true }));
        const JWTSECRET = await ssmClient.send(new GetParameterCommand({ Name: '/bxcrd/prod/JWTSECRET', WithDecryption: true }));
        exports.MONGODBURL = MONGODBURL;
        exports.JWTSECRET = JWTSECRET;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

exports.fetchSecrets = fetchSecrets;
