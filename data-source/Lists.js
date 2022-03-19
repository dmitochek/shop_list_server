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

    async getProducts(token, listname)
    {

        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await this.collection.findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        console.log(list);

        let serverAnswer = [];

        for (let i = 0; i < list.length; ++i)
        {
            let { name } = await client.db("shopDB").collection('products').findOne({ _id: ObjectID(list[i].product_id) });
            serverAnswer = [...serverAnswer, Object.assign({ name: name }, list[i])];
        }

        return serverAnswer;

    }

    async editProduct(token, listname, product, newcategory, newunit, newnote, newquanity)
    {
        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let res = await this.collection.findOne(
            { users: { $in: [_id.toString()] }, name: listname }
        );

        if (res === null) return false;

        let product_id = null;
        await Promise.all(res.list.map(async (elem) =>
        {
            const eachproduct = await client.db("shopDB").collection('products').findOne({ _id: ObjectID(elem.product_id) });
            if (product === eachproduct.name)
                product_id = elem.product_id;
        }));

        if (product_id === null) return false;

        await this.collection.findOneAndUpdate(
            { users: { $in: [_id.toString()] }, name: listname, "list.product_id": product_id },
            { $set: { "list.$.quanity": newquanity, "list.$.unit": newunit, "list.$.category": newcategory, "list.$.note": newnote } }
        );

        return true;
    }

    async changeProductsStates(token, listname, listarray, liststates)
    {

        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await this.collection.findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        let products = [], productsIDs = [];
        for (let i = 0; i < list.length; ++i)
        {
            let { name } = await client.db("shopDB").collection('products').findOne({ _id: ObjectID(list[i].product_id) });
            productsIDs.push(list[i].product_id);
            products.push(name);
        }


        await Promise.all(listarray.map(async (elem, index) =>
        {
            for (let i = 0; i < elem.length; ++i)
            {
                for (let j = 0; j < list.length; ++j)
                    if (products[productsIDs.indexOf(list[j].product_id)] === elem[i])
                    {

                        let res = await this.collection.updateOne(
                            { name: listname, users: { $in: [_id.toString()] } },
                            { $set: { "list.$[element].checked": liststates[index][i] } },
                            { arrayFilters: [{ "element.product_id": list[j].product_id }] }
                        );

                    }
            }
        }
        ));


        return true;
    }

    async newProduct(token, listname, product)
    {
        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await this.collection.findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        let res = await client.db("shopDB").collection('products').find({ name: product }).toArray();

        let id = null, num;
        res.forEach((elem, index) =>
        {
            if (elem.user_id === _id.toString())
            {
                id = elem._id.toString();
                num = index;
            }

            if (id === null && elem.user_id === null)
            {
                id = elem._id.toString();
                num = index;
            }

        });

        let answer = await this.collection.updateOne(
            { name: listname, users: { $in: [_id.toString()] } },
            { $push: { list: { product_id: id, quanity: res[num].diff_step, note: null, unit: res[num].unit, category: res[num].category, checked: false } } }
        );


        return true;

    }


    async deleteProduct(token, listname, product)
    {
        const { email } = await this.checkUser(token);

        let { _id } = await client.db("shopDB").collection('users').findOne({ email: email });

        let { list } = await this.collection.findOne(
            { name: listname },
            { users: { $in: [_id.toString()] } }
        );

        let res = await client.db("shopDB").collection('products').find({ name: product }).toArray();

        let id = null, num;
        res.forEach((elem, index) =>
        {
            if (elem.user_id === _id.toString())
            {
                id = elem._id.toString();
                num = index;
            }

            if (id === null && elem.user_id === null)
            {
                id = elem._id.toString();
                num = index;
            }

        });

        let updatedList = [];
        list.map((elem) =>
        {
            if (elem.product_id !== id) updatedList.push(elem);
        }
        );

        console.log(updatedList);

        let result = await this.collection.updateOne(
            { name: listname, users: { $in: [_id.toString()] } },
            { $set: { list: updatedList } }
        );

        return true;
    }

}

exports.default = Lists;