const express = require('express');
const bodyParser = require('body-parser');
const cosmosdb = require('./cosmosdb');
const paystack = require('./paystack');
const cors = require('cors');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000; // Use the provided port or default to 3000

app.use(cors());
app.use(bodyParser.json());

// app.use(express.json());

// Schedule Subscription Renewal Check (Every day at 3:00 AM)
cron.schedule('0 3 * * *', async () => {
    try {
        await checkSubscriptionStatus();
    } catch (error) {
        console.error('Error checking subscription status:', error);
    }
});

// Check Subscription Status and Handle Expiry
async function checkSubscriptionStatus() {
    try {
        const currentDate = new Date();
        const expiredSubscriptions = await cosmosdb.getExpiredSubscriptions(currentDate);

        // Check if any subscriptions have expired
        expiredSubscriptions.forEach(async subscription => {
            // Check if the user has renewed the subscription on Paystack
            console.log(subscription.customer_code)
            const renewed = await paystack.checkSubscriptionRenewal(subscription.customer_code);
            console.log(renewed)

            const userID = await cosmosdb.getUserByEmail(renewed.customerSubscription.email);
            console.log(userID.id)
            
            if (renewed.customerStatus) {
                console.log('ID in inner checkSubscription: ', userID.id)
                
                // Update subscription details in the database based on the renewed subscription
               await cosmosdb.updateSubscription(
                    userID.id, {
                    email: renewed.customerSubscription.email,
                    // planCode: renewed.customerSubscription.planCode,
                    start_date: renewed.customerSubscription.start_date,
                    end_date: renewed.customerSubscription.end_date,
                    paystack_subscription_id: renewed.customerSubscription.id
                });
            } else {
                console.log('ID in inner else checkSubscription: ', userID.id)
                // Handle expired subscription (e.g., downgrade account, restrict access)
                await cosmosdb.updateSubscription(
                    userID.id, {
                    subscription: 'free'
                });
            }
        });
    } catch (error) {
        console.error('Error checking subscription status:', error);
        throw error;
    }
}


app.get('/user', async (req, res) => {
    try {
        const { email, planCode } = req.query;
      
        // Check if both email and planCode are present
        if (!email || !planCode) {
          return res.status(400).send('Email and planCode are required');
        }
        console.log(email)
        console.log(planCode)
        // if (!isEmailValid(email)) {
        //     return res.status(400).send('Invalid email');
        // }

        await checkSubscriptionStatus();
        
        user = await cosmosdb.getUserByEmail(email);
        console.log('users from index.js', user)
        if (user) {
            const userData = await checkUserSubscriptionStatus(user);
            console.log('userId from checkUserSub: ', userData.userId)
            
        console.log('userId.end_date before pass: ', userData.end_date)
            if (userData.end_date) {

                // persist payment OR pass
                console.log('User still has a valid subscription!')
                return res.status(200).send('You still have a valid subscription!');

            } else {
                // Subscription has expired, initiate payment
                const { authorization_url } = await paystack.createSubscription(email, planCode);
                return res.redirect(authorization_url);
            }
        }

       // Create subscription and initiate payment
       const { authorization_url } = await paystack.createSubscription(email, planCode);
        // Redirect client to Paystack authorization URL
        res.redirect(authorization_url);

    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).send('Internal server error');
    }
});

app.post('/user', async (req, res) => {
    try {
        const { email, planCode } = req.body;
        // if (!isEmailValid(email)) {
        //     return res.status(400).send('Invalid email');
        // }

        
        await checkSubscriptionStatus();
        
        user = await cosmosdb.getUserByEmail(email);
        console.log('users from index.js', user)
        if (user) {
            const userData = await checkUserSubscriptionStatus(user);
            console.log('userId from checkUserSub: ', userData.userId)
            
        console.log('userId.end_date before pass: ', userData.end_date)
            if (userData.end_date) {

                // persist payment OR pass
                console.log('User still has a valid subscription!')
                return res.status(200).send('You still have a valid subscription!');

            } else {
                // Subscription has expired, initiate payment
                const { authorization_url } = await paystack.createSubscription(email, planCode);
                return res.redirect(authorization_url);
            }
        }

       // Create subscription and initiate payment
       const { authorization_url } = await paystack.createSubscription(email, planCode);
        // Redirect client to Paystack authorization URL
        res.redirect(authorization_url);

    } catch (error) {
        console.error('Error creating user:', error);
        return res.status(500).send('Internal server error');
    }
});

async function checkUserSubscriptionStatus(user) {
    try {
        console.log('inside checkusersubstat')

        // Check if the user's subscription is 'paid' and within one month from the current date
        const currentDate = new Date();
        // const oneMonthLater = new Date(currentDate);
        // oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

        if (user.subscription === 'paid' && new Date(user.end_date) >= currentDate) {
            // User's subscription is 'paid' and not due today
            console.log(user.id)
            return { userId: user.id, email: user.email, end_date: user.end_date };
        } else {
            // User's subscription is not within one month
            console.log(user.email)
            return { userId: user.id, email: user.email };
        }
    } catch (error) {
        console.error('Error checking user subscription status:', error);
        throw error;
    }
}


// Define a route to get user data by email
app.get('/getUser', async (req, res) => {
    try {
        const { email } = req.query;

        if (!email) {
            return res.status(400).json({ error: 'Email parameter is missing' });
        }

        const userData = await cosmosdb.getUserByEmail(email);

        if (!userData) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(userData);
    } catch (error) {
        console.error('Error getting user data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Define a route to create a new user
app.post('/createUser', async (req, res) => {
    try {
        const newUser = req.body;

        // Create a new user record in the database
        await cosmosdb.createUser(newUser);

        // Respond with success message
        res.status(200).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/updateCredits', async (req, res) => {
    try {
        // const { email, credits } = req.query;
        const { email, credits } = req.body;

        if (!email && credits === 0) {
        const updatedCredits = parseInt(credits); 
                // Update user subscription with new credits
                const updatedUser = await cosmosdb.getUserByEmail(email);
                console.log(updatedCredits)
                console.log('ID in updateCredits: ', updatedUser.id)
        
                const newCredits = await cosmosdb.updateSubscription(updatedUser.id, {
                    email: email,
                    subscription: 'free',
                    // planCode: data.data.plan,
                    credits: updatedCredits
                });
                console.log(newCredits)
                res.status(200).json(newCredits);
        } else if (!email) {
            return res.status(400).json({ error: 'Email parameter is required' });
        } else if (credits < 0) {
            return res.status(400).json({ error: 'Credits cannot be negative' });
        }
        

        const updatedCredits = parseInt(credits); // Parse credits to integer

        
        // Update user subscription with new credits
        const updatedUser = await cosmosdb.getUserByEmail(email);
        console.log(updatedCredits)
        console.log('ID in updateCredits: ', updatedUser.id)

        const newCredits = await cosmosdb.updateSubscription(updatedUser.id, {
            email: email,
            subscription: 'free',
            // planCode: data.data.plan,
            credits: updatedCredits
        });
        console.log(newCredits)
        res.status(200).json(newCredits);
    } catch (error) {
        console.error('Error updating user credits:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// WORKING Route for initiating subscription and payment
app.post('/subscribe', async (req, res) => {
    try {
        // Extract email and plan code from request body
        const { email, planCode } = req.body;

        // Create subscription and initiate payment
        const subscription = await paystack.createSubscription(email, planCode);

        // Redirect client to Paystack authorization URL
        res.redirect(subscription.authorization_url);
    } catch (error) {
        console.error('Error initiating subscription:', error);
        res.status(500).send('Internal server error');
    }
});

function isEmailValid(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Route for handling Paystack webhook events (transaction verification)
app.get('/paystack/verify', async (req, res) => {
    try {
        const { trxref } = req.query;

        const transactionVerification = await paystack.verifyTransaction(trxref);

        if (transactionVerification.data.status === 'success') {
            // Transaction verified successfully
            // You can update the HTML to show a success message
            const successMessage = `
            <!-- Bootstrap CSS via CDN -->
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
                <div class="container">
                    <div class="row">
                        <div class="col-md-6 offset-md-3 text-center mt-5">
                            <h1 class="text-success">Transaction Successful</h1>
                            <p>Thank you for your purchase!</p>
                            <p>You can now close this page.</p>
                        </div>
                    </div>
                </div>
            `;
            // Transaction verified successfully, handle accordingly
            // For example, update database with subscription details
            await handleSubscriptionVerification(transactionVerification);
            console.log('subscribed successfully!')
            // console.log(transactionVerification)
            // return subscriptionData;
            res.send(successMessage);
        } else {
            // Transaction failed verification
            // You can update the HTML to show a failure message
            const failureMessage = `
            <!-- Bootstrap CSS via CDN -->
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
                <div class="container">
                    <div class="row">
                        <div class="col-md-6 offset-md-3 text-center mt-5">
                            <h1 class="text-danger">Transaction Failed</h1>
                            <p>Sorry, your payment could not be processed.</p>
                        </div>
                    </div>
                </div>
            `;
            res.send(failureMessage);
        }
    } catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).send('Internal server error');
    }
});

async function handleSubscriptionVerification(data) {
    console.log(data.status)
console.log(data.data.customer.email)
const endDate = new Date(data.data.paid_at);
// Add one month
endDate.setMonth(endDate.getMonth() + 1);

// Set the day to the last day of the month
// endDate.setDate(0);

// Format the end date as needed (e.g., 'YYYY-MM-DD')
const formattedEndDate = endDate.toISOString().split('T')[0];
// const formattedEndDate = endDate.toISOString().split('T')[0];


const userID = await cosmosdb.getUserByEmail(data.data.customer.email);
console.log(userID.id)
console.log('ID in handleSubscription: ', userID.id)

    await cosmosdb.updateSubscription(userID.id, {
        email: data.data.customer.email,
        // planCode: data.data.plan,
        start_date: data.data.paid_at,
        end_date: endDate,
        paystack_subscription_id: data.data.id,
        subscription: 'paid',
        payment_reference: data.data.reference
    });

    return userID;
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { handler: app };
