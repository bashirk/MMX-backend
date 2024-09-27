const cron = require('cron');
const { checkSubscriptionStatus } = require('./functions/index'); // function to be tested

jest.mock('cron');
jest.mock('./cosmosdb');
jest.mock('./paystack'); 

describe('checkSubscriptionStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('it should check expired subscriptions and handle renewal', async () => {
        // Mock the return value of cosmosdb.getExpiredSubscriptions
        const expiredSubscriptions = [{ customer_code: 'test_customer_code' }];
        jest.spyOn(require('./functions/cosmosdb'), 'getExpiredSubscriptions').mockResolvedValue(expiredSubscriptions);

        // Mock the return value of paystack.checkSubscriptionRenewal
        const renewed = {
            customerStatus: true,
            customerSubscription: {
                email: 'test@example.com',
                start_date: '2024-04-01',
                end_date: '2024-05-01',
                id: 'test_subscription_id'
            }
        };
        jest.spyOn(require('./functions/paystack'), 'checkSubscriptionRenewal').mockResolvedValue(renewed);

        // Mock the return value of cosmosdb.getUserByEmail
        const user = { id: 'test_user_id' };
        jest.spyOn(require('./functions/cosmosdb'), 'getUserByEmail').mockResolvedValue(user);

        // Mock the implementation of cosmosdb.updateSubscription
        const updateSubscriptionMock = jest.spyOn(require('./functions/cosmosdb'), 'updateSubscription');

        // Run the function
        await checkSubscriptionStatus();

        // Expectations
        expect(updateSubscriptionMock).toHaveBeenCalledTimes(1);
        expect(updateSubscriptionMock).toHaveBeenCalledWith('test_user_id', {
            email: 'test@example.com',
            start_date: '2024-04-01',
            end_date: '2024-05-01',
            paystack_subscription_id: 'test_subscription_id'
        });
    });

    // TODO: more test cases to cover other scenarios (e.g., expired subscriptions)
});
