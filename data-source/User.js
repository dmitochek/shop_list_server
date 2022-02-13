const { MongoDataSource } = require('apollo-datasource-mongodb');
const ObjectID = require('mongodb').ObjectID;
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.CLIENT_ID);

class User extends MongoDataSource
{

    async checkUser(token)
    {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID
        });
        return ticket.getPayload();
    }

    async getUser(token)
    {
        const { email } = await this.checkUser(token);
        let result = await this.collection.findOne({ email: email });
        return result;

    }


    async tokenCheck(token)
    {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID
        });

        const { name, email, picture } = ticket.getPayload();

        if (email === undefined)
        {
            return false;
        }

        let result = await this.collection.findOne({ email: email });

        if (result === null)
        {
            let result = await this.collection.insertOne({ email: email, category_order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
        }

        return true;
    }

}

exports.default = User;