const { CosmosClient } = require("@azure/cosmos");

const databaseId = "DB_NAME";
const containerId = "CONTAINER_NAME";
const endpoint = "https://YOUR_COSMOS_DB_URI";
const key = "DOCUMENT_KEY==";

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

async function insertSubscription(subscriptionData) {
    const { resource: createdItem } = await container.items.create(subscriptionData);
    return createdItem;
}

async function getActiveSubscriptions(currentDate) {
    const querySpec = {
        query: "SELECT * FROM c WHERE c.start_date <= @currentDate AND c.end_date >= @currentDate",
        parameters: [
            { name: "@currentDate", value: currentDate.toISOString() }
        ]
    };
    const { resources: subscriptions } = await container.items.query(querySpec).fetchAll();
    return subscriptions;
}

async function getExpiredSubscriptions(currentDate) {
    const querySpec = {
        query: "SELECT * FROM c WHERE c.end_date < @currentDate",
        parameters: [
            { name: "@currentDate", value: currentDate.toISOString() }
        ]
    };
    const { resources: subscriptions } = await container.items.query(querySpec).fetchAll();
    return subscriptions;
}

async function updateSubscription(id, subscriptionData) {
    const { resource: existingItem } = await container.item(id).read();

    if (!existingItem) {
        throw new Error('Item not found');
    }

    // Update the subscription property
    existingItem.email = subscriptionData.email;
    existingItem.credits = subscriptionData.credits;
    existingItem.start_date = subscriptionData.start_date;
    existingItem.end_date = subscriptionData.end_date;
    existingItem.subscription_id = subscriptionData.paystack_subscription_id;
    existingItem.subscription = subscriptionData.subscription;
    existingItem.payment_reference = subscriptionData.payment_reference;

    // Perform the patch operation
    const { resource: updatedItem } = await container.item(id).replace(existingItem);
    return updatedItem;
}


async function handleExpiredSubscription(email) {
    const subscriptionData = await container.item(email).read();
    if (subscriptionData) {
        subscriptionData.limit = 'free'; // Change limit to free
        await container.item(email).replace(subscriptionData);
    }
}

async function getUserByEmail(email) {
    const querySpec = {
        query: 'SELECT * FROM c WHERE c.email = @email',
        parameters: [
            {
                name: '@email',
                value: email
            }
        ]
    };

    const { resources: users } = await container.items.query(querySpec).fetchAll();
    if (users.length > 0) {
        // Return the first user found
        // FIX: not returning users, to return the container id
        return users[0];
    } else {
        // Return null if no user found
        return null;
    }
}

async function createUser(userData) {
    // const { resource: createdUser } = await container.item(email).patch(userData);
    const { resource: createdUser } = await container.items.create(userData);
    return createdUser;
}

module.exports = {
    insertSubscription,
    getActiveSubscriptions,
    getExpiredSubscriptions,
    updateSubscription,
    handleExpiredSubscription,
    getUserByEmail,
    createUser
};
