const https = require('https');

const secretKey = 'PAYSTACK_SECRET_KEY';

async function listPlans() {
    try {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/plan',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secretKey}`
            }
        };

        const response = await makeRequest(options);
        console.log('List Plans Response:', response);
        return response.data;
    } catch (error) {
        console.error('Error listing plans:', error);
        throw error;
    }
}

// Function to verify transaction with Paystack
async function verifyTransaction(reference) {
    try {
        // Make request to Paystack API to verify transaction
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/transaction/verify/${reference}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secretKey}`
            }
        };

        // Send request to Paystack API
        return await makeRequest(options);
    } catch (error) {
        console.error('Error verifying transaction:', error);
        throw error;
    }
}

async function createSubscription(email, planCode) {
    try {
        // Create plan if not exist
        const plan = await createPlan(planCode);
        console.log('Plan:', planCode);
        
        // Make request to Paystack API to initiate payment
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/transaction/initialize',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        };
        // Payload for initiating payment
        const payload = JSON.stringify({
            email,
            plan: planCode,
            amount: 100000 // Example amount
            // callback_url: 'http://localhost:3000/paystack/verify' // Your webhook URL
        });

         // Send request to Paystack API
         const response = await makeRequest(options, payload);
        
         // Extract authorization URL and transaction reference from response
        //  const { authorization_url, reference } = response.data;
        // Return subscription data along with authorization URL
    return response.data;
    
    } catch (error) {
        console.error('Error creating subscription:', error);
        throw error;
    }
}

async function createPlan(planCode) {
    try {
        // Check if plan exists
        const existingPlan = await getPlan(planCode);
        if (existingPlan) {
            return existingPlan;
        }

        const params = JSON.stringify({ name: 'free', interval: 'monthly', amount: 500000 });
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: '/plan',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${secretKey}`,
                'Content-Type': 'application/json'
            }
        };

        const response = await makeRequest(options, params);
        console.log('Create Plan Response:', response);
        return response.data;
    } catch (error) {
        console.error('Error creating plan:', error);
        throw error;
    }
}

async function getPlan(planCode) {
    try {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/plan/${planCode}`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${secretKey}`
            }
        };

        const response = await makeRequest(options);
        console.log('Get Plan Response:', response);
        return response.data;
    } catch (error) {
        // Plan does not exist
        return null;
    }
}

async function checkSubscriptionRenewal(customerCode) {
    try {
        const options = {
            hostname: 'api.paystack.co',
            port: 443,
            path: `/subscription?data.customer.customer_code=${customerCode}`,
            method: 'GET',
            headers: {
                Authorization: `Bearer ${secretKey}`
            }
        };

        const response = await makeRequest(options);
        console.log(response)

        const subscriptions = response.data;
        
        // Find the subscription associated with the customer code
        const customerSubscription = subscriptions.find(subscription => subscription.customer.customer_code === customerCode);
        
        if (customerSubscription) {
            // Check if subscription needs renewal
            const nextPaymentDate = new Date(customerSubscription.next_payment_date);
            const currentDate = new Date();
            if (nextPaymentDate <= currentDate) {
                // Subscription needs renewal
                console.log('Subscription needs renewal for customer:', customerCode);
            }
            
            return { customerSubscription, customerStatus: customerSubscription.status };
        } else {
            throw new Error('Subscription not found');
        }
    } catch (error) {
        console.error('Error checking subscription renewal:', error);
        throw error;
    }
}


function makeRequest(options, params = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';

            res.on('data', chunk => {
                data += chunk;
            });

            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        });

        req.on('error', error => {
            reject(error);
        });

        if (params) {
            req.write(params);
        }

        req.end();
    });
}

module.exports = { listPlans, createSubscription, verifyTransaction, checkSubscriptionRenewal };
