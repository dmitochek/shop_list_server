const { MongoDataSource } = require('apollo-datasource-mongodb');
const ObjectID = require('mongodb').ObjectID;
const { OAuth2Client } = require('google-auth-library');
const clnt = new OAuth2Client(process.env.CLIENT_ID);
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017/shopDB');
client.connect();

class Products extends MongoDataSource
{
    async checkUser(token)
    {
        const ticket = await clnt.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID
        });
        return ticket.getPayload();
    }

    async getPopular(token)
    {
        const { email } = await this.checkUser(token);
    }

    async getlistitems(token, listname)
    {
        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await client.db("shopDB").collection('lists').findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        let result = [];

        await Promise.all(list.map(async product =>
        {
            const { name, category } = await client.db("shopDB").collection('products').findOne({ _id: ObjectID(product.product_id) });
            result = [...result, { name: name, category: product.category }];
            //result = [...result, { name: name, category: category }]; return to this variant
        }));

        return result;

    }

    async searchitems(token, name, listname)
    {
        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await client.db("shopDB").collection('lists').findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        let checked = [];
        await Promise.all(list.map(async product =>
        {
            let result = await this.collection.findOne({ _id: ObjectID(product.product_id) });
            checked.push(result.name);
        }));

        let res = await this.collection.find({ name: { $regex: name } }).toArray();

        let serverAnswer = [];

        res.forEach(element =>
        {
            if (checked.includes(element.name))
                serverAnswer.push({ name: element.name, checked: true });
            else
                serverAnswer.push({ name: element.name, checked: false });
        });

        console.log(serverAnswer);
        if (serverAnswer.length >= 15)
        {
            serverAnswer.splice(15);
            return serverAnswer;
        }
        else return serverAnswer;

    }
}

exports.default = Products;