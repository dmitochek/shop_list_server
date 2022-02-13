const { MongoDataSource } = require('apollo-datasource-mongodb');
const ObjectID = require('mongodb').ObjectID;
const { OAuth2Client } = require('google-auth-library');
const clnt = new OAuth2Client(process.env.CLIENT_ID);
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017/shopDB');
client.connect();

class Lists extends MongoDataSource
{
    async checkUser(token)
    {
        const ticket = await clnt.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID
        });
        return ticket.getPayload();
    }
    async getLists(token)
    {
        const { name, email, picture } = await this.checkUser(token);

        let result = await client.db("shopDB").collection('users').findOne({ email: email });
        console.log(result);

        let lists = await this.collection.find(
            { users: result._id.toString() }
        ).toArray();
        console.log(lists);
        return lists;
    }

    async renameList(token, _id, newname)
    {
        const { name, email, picture } = await this.checkUser(token);

        let result = await client.db("shopDB").collection('users').findOne({ email: email });
        console.log(result);

        let rnm = await this.collection.updateOne(
            { _id: ObjectID(_id) },
            { $set: { name: newname } }
        );
        console.log(rnm.modifiedCount);

        return rnm.modifiedCount >= 0 ? true : false;
    }

    async shareList(token, _id, newemail)
    {
        const { name, email, picture } = await this.checkUser(token);

        let result = await client.db("shopDB").collection('users').findOne({ email: newemail });
        console.log(result);

        if (newemail === email) return false;

        let res = await this.collection.updateOne(
            { _id: ObjectID(_id) },
            { $addToSet: { users: result._id.toString() } }
        );
        console.log(res.modifiedCount);

        return res.modifiedCount == 1 ? true : false;
    }

    async copyList(token, _id, newlistname)
    {
        const { email, picture } = await this.checkUser(token);

        let result = await client.db("shopDB").collection('users').findOne({ email: email });
        console.log(result);

        let { name, list, size, completed } = await this.collection.findOne({ _id: ObjectID(_id) });

        if (name === newlistname) return false;

        let res = await this.collection.insertOne({ name: newlistname, size: size, users: [result._id.toString()], completed: completed, date: Date.now(), list: list });

        return true;
    }

    async removeList(token, _id)
    {
        const { email } = await this.checkUser(token);

        let result = await client.db("shopDB").collection('users').findOne({ email: email });
        console.log(result);

        let { name, list, size, completed, users } = await this.collection.findOne({ _id: ObjectID(_id) });

        let res = await client.db("shopDB").collection('removedLists').insertOne({ name: name, size: size, users: users, completed: completed, date: Date.now(), list: list });

        let deleted = await this.collection.deleteOne({ _id: ObjectID(_id) });

        return true;
    }

    async updateDBpopular()
    {
        let lists = await this.collection.find().toArray();
        let products = await client.db("shopDB").collection('products').find().toArray();

        products.map(async (product) =>
        {
            let product_id = product._id.toString();
            let frequency = 0;

            lists.map((elem) =>
            {
                for (let i = 0; i < elem.list.length; ++i)
                    if (elem.list[i].product_id === product_id) ++frequency;

            });

            let res = await client.db("shopDB").collection('products').updateOne(
                { _id: ObjectID(product_id) },
                { $set: { raiting: frequency } }
            );

        });
    }

    async createList(token, newname)
    {
        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let res = await this.collection.insertOne({ name: newname, size: 0, users: [_id.toString()], completed: 0, date: Date.now(), list: [] });

        return true;
    }

    async getProduct(token, listname, product)
    {

        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await this.collection.findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        let res = await client.db("shopDB").collection('products').find({ name: product }).toArray();

        let product_id = null, temp_id;
        res.forEach(element =>
        {
            if (element.user_id !== null && element.user_id.includes(_id.toString()))
            {
                product_id = element._id;
            }
            temp_id = element._id;
        });

        if (product_id === null) product_id = temp_id;

        let server_answer;
        list.forEach(element =>
        {
            if (element.product_id === product_id.toString())
                server_answer = element;
        });

        return server_answer;

    }


}

exports.default = Lists;