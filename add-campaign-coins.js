const { MongoClient } = require('mongodb');

async function addCampaignCoins() {
  const client = new MongoClient('mongodb://localhost:27017');
  await client.connect();
  const db = client.db('reward-system');
  
  const result = await db.collection('users').updateOne(
    { email: 'ayushninawe45@gmail.com' }, 
    { 
      $set: { 
        campaignCoins: [{
          campaignId: 'entertainment-campaign',
          campaignName: 'Entertainment Campaign',
          balance: 500,
          restrictionType: 'category',
          allowedCategories: ['Entertainment'],
          expiryDate: '2025-12-31T23:59:59.999Z'
        }]
      }
    }
  );
  
  console.log('Updated user with campaign coins:', result.modifiedCount);
  
  // Verify the update
  const user = await db.collection('users').findOne({ email: 'ayushninawe45@gmail.com' });
  console.log('User campaign coins:', JSON.stringify(user.campaignCoins, null, 2));
  
  await client.close();
}

addCampaignCoins().catch(console.error);
