const { MongoDataSource } = require('apollo-datasource-mongodb');
const ObjectID = require('mongodb').ObjectID;

class User extends MongoDataSource
{

    async getUser(id)
    {
        let result = await this.collection.findOne({ _id: ObjectID(id) });
        console.log(result);
        return result;
    }

    async changeUser(_id, name)
    {
        let result = await this.collection.updateOne
            (
                { _id: ObjectID(_id) },
                { $pull: { lists: { name: name } } }
            );
        if (result.modifiedCount >= 1)
        {
            return true;
        }
        else
        {
            return false;
        }
    }

    async renameList(_id, name, newname)
    {
        let result = await this.collection.findOneAndUpdate
            (
                { _id: ObjectID(_id) },
                { $set: { "lists.$[elem].name": newname } },
                { arrayFilters: [{ "elem.name": name }] }
            );
        console.log(result);
        return result.lastErrorObject.updatedExisting;
    }

    async addNewListName(_id, name)
    {
        let result = await this.collection.updateOne
            (
                { _id: ObjectID(_id) },
                {
                    $addToSet:
                    {
                        lists: { name: name, list: [] }
                    }
                },
            );
        console.log(result);
        return true;
    }

    //list: {product_name: ... , product_quantity: ... , product_units_value: ...}
    async addnewlistItem(_id, name, product_name, product_quantity, product_units_value)
    {
        let result = await this.collection.updateOne
            (
                { _id: ObjectID(_id) },
                { $push: { "lists.$[elem].list": { product_name: product_name, product_quantity: product_quantity, product_units_value: product_units_value } } },
                { arrayFilters: [{ "elem.name": name }] }
            );
        console.log(result);
        return true;
    }
}

exports.default = User;