import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import * as schema from '../src/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('Seeding database...\n');

  await db.delete(schema.budgetBinders).where(eq(schema.budgetBinders.name, 'Demo Budget'));

  const passwordHash = await bcrypt.hash('demo123', 10);
  const [binder] = await db
    .insert(schema.budgetBinders)
    .values({
      name: 'Demo Budget',
      description: 'A demo budget binder for presentations and testing',
      currency: 'USD',
      passwordHash,
    })
    .returning();
  console.log(`> Created binder: "${binder.name}" (password: demo123)`);

  const bId = binder.id;

  const [checking, savings, creditCard, cashWallet, investmentPortfolio] = await db
    .insert(schema.accounts)
    .values([
      { binderId: bId, name: 'Checking Account', type: 'checking' },
      { binderId: bId, name: 'Savings Account', type: 'savings' },
      { binderId: bId, name: 'Credit Card', type: 'credit' },
      { binderId: bId, name: 'Cash Wallet', type: 'cash' },
      { binderId: bId, name: 'Investment Portfolio', type: 'investment' },
    ])
    .returning();
  console.log('> Created 5 accounts');

  const [
    freshMart,
    cityPower,
    aquaWater,
    netConnect,
    primeFit,
    techStore,
    sunriseApts,
    acmeCorp,
    gasNGo,
    streamFlixPayee,
  ] = await db
    .insert(schema.payees)
    .values([
      { binderId: bId, name: 'FreshMart Grocery' },
      { binderId: bId, name: 'City Power & Electric' },
      { binderId: bId, name: 'Aqua Water Services' },
      { binderId: bId, name: 'NetConnect Internet' },
      { binderId: bId, name: 'PrimeFit Gym' },
      { binderId: bId, name: 'TechStore Online' },
      { binderId: bId, name: 'Sunrise Apartments' },
      { binderId: bId, name: 'Acme Corp' },
      { binderId: bId, name: 'Gas N Go' },
      { binderId: bId, name: 'StreamFlix' },
    ])
    .returning();
  console.log('> Created 10 payees');

  const [food, transport, utilities, entertainment, health, shopping, income, housing] = await db
    .insert(schema.tags)
    .values([
      { binderId: bId, name: 'Food & Dining', color: '#EF4444' },
      { binderId: bId, name: 'Transportation', color: '#F59E0B' },
      { binderId: bId, name: 'Utilities', color: '#3B82F6' },
      { binderId: bId, name: 'Entertainment', color: '#8B5CF6' },
      { binderId: bId, name: 'Health & Fitness', color: '#10B981' },
      { binderId: bId, name: 'Shopping', color: '#EC4899' },
      { binderId: bId, name: 'Income', color: '#22C55E' },
      { binderId: bId, name: 'Housing', color: '#6366F1' },
    ])
    .returning();
  console.log('> Created 8 tags');

  const [essential, discretionary, savingsCat, debt] = await db
    .insert(schema.categories)
    .values([
      { binderId: bId, name: 'Essential' },
      { binderId: bId, name: 'Discretionary' },
      { binderId: bId, name: 'Savings & Investments' },
      { binderId: bId, name: 'Debt & Obligations' },
    ])
    .returning();
  console.log('> Created 4 categories');

  await db.insert(schema.accountTags).values([
    { binderId: bId, accountId: checking.id, tagId: food.id },
    { binderId: bId, accountId: checking.id, tagId: transport.id },
    { binderId: bId, accountId: checking.id, tagId: utilities.id },
    { binderId: bId, accountId: checking.id, tagId: entertainment.id },
    { binderId: bId, accountId: checking.id, tagId: health.id },
    { binderId: bId, accountId: checking.id, tagId: shopping.id },
    { binderId: bId, accountId: checking.id, tagId: income.id },
    { binderId: bId, accountId: checking.id, tagId: housing.id },
    { binderId: bId, accountId: savings.id, tagId: income.id },
    { binderId: bId, accountId: creditCard.id, tagId: food.id },
    { binderId: bId, accountId: creditCard.id, tagId: entertainment.id },
    { binderId: bId, accountId: creditCard.id, tagId: shopping.id },
    { binderId: bId, accountId: cashWallet.id, tagId: food.id },
    { binderId: bId, accountId: cashWallet.id, tagId: transport.id },
    { binderId: bId, accountId: investmentPortfolio.id, tagId: income.id },
  ]);
  console.log('> Created 15 account-tag links');

  await db.insert(schema.accountCategories).values([
    { binderId: bId, accountId: checking.id, categoryId: essential.id },
    { binderId: bId, accountId: checking.id, categoryId: discretionary.id },
    { binderId: bId, accountId: savings.id, categoryId: savingsCat.id },
    { binderId: bId, accountId: creditCard.id, categoryId: debt.id },
    { binderId: bId, accountId: creditCard.id, categoryId: discretionary.id },
    { binderId: bId, accountId: cashWallet.id, categoryId: discretionary.id },
    { binderId: bId, accountId: investmentPortfolio.id, categoryId: savingsCat.id },
  ]);
  console.log('> Created 7 account-category links');

  async function createTx(data: {
    accountId: string;
    amount: string;
    date: string;
    payeeId?: string;
    notes?: string;
    isCleared?: boolean;
    tagIds?: string[];
    transferId?: string;
  }) {
    const [tx] = await db
      .insert(schema.transactions)
      .values({
        binderId: bId,
        accountId: data.accountId,
        amount: data.amount,
        date: data.date,
        payeeId: data.payeeId,
        notes: data.notes,
        isCleared: data.isCleared ?? false,
        transferId: data.transferId,
      })
      .returning();

    if (data.tagIds && data.tagIds.length > 0) {
      await db
        .insert(schema.transactionTags)
        .values(data.tagIds.map((tagId) => ({ binderId: bId, transactionId: tx.id, tagId })));
    }

    return tx;
  }

  const aprSalary = await createTx({
    accountId: checking.id,
    amount: '5000.00',
    date: '2026-04-01',
    payeeId: acmeCorp.id,
    notes: 'Monthly salary',
    isCleared: true,
    tagIds: [income.id],
  });
  const aprRent = await createTx({
    accountId: checking.id,
    amount: '-1200.00',
    date: '2026-04-02',
    payeeId: sunriseApts.id,
    notes: 'Monthly rent',
    isCleared: true,
    tagIds: [housing.id],
  });
  const aprGroceries1 = await createTx({
    accountId: checking.id,
    amount: '-85.50',
    date: '2026-04-05',
    payeeId: freshMart.id,
    notes: 'Weekly groceries',
    isCleared: true,
    tagIds: [food.id],
  });
  const aprElectric = await createTx({
    accountId: checking.id,
    amount: '-95.00',
    date: '2026-04-07',
    payeeId: cityPower.id,
    notes: 'April electric bill',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const aprGym = await createTx({
    accountId: checking.id,
    amount: '-49.99',
    date: '2026-04-10',
    payeeId: primeFit.id,
    notes: 'Monthly membership',
    isCleared: true,
    tagIds: [health.id],
  });
  const aprInternet = await createTx({
    accountId: checking.id,
    amount: '-79.99',
    date: '2026-04-12',
    payeeId: netConnect.id,
    notes: 'Internet service',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const aprGas = await createTx({
    accountId: cashWallet.id,
    amount: '-45.00',
    date: '2026-04-15',
    payeeId: gasNGo.id,
    notes: 'Gas refill',
    isCleared: true,
    tagIds: [transport.id],
  });
  const aprStreaming = await createTx({
    accountId: creditCard.id,
    amount: '-15.99',
    date: '2026-04-18',
    payeeId: streamFlixPayee.id,
    notes: 'Monthly subscription',
    isCleared: true,
    tagIds: [entertainment.id],
  });
  const aprTech = await createTx({
    accountId: creditCard.id,
    amount: '-249.99',
    date: '2026-04-20',
    payeeId: techStore.id,
    notes: 'New monitor',
    isCleared: true,
    tagIds: [shopping.id],
  });

  const aprTransferFrom = await createTx({
    accountId: checking.id,
    amount: '-500.00',
    date: '2026-04-22',
    notes: 'Transfer to savings',
    isCleared: true,
    tagIds: [income.id],
  });
  const aprTransferTo = await createTx({
    accountId: savings.id,
    amount: '500.00',
    date: '2026-04-22',
    notes: 'Transfer from checking',
    isCleared: true,
    tagIds: [income.id],
    transferId: aprTransferFrom.id,
  });
  await db
    .update(schema.transactions)
    .set({ transferId: aprTransferTo.id })
    .where(eq(schema.transactions.id, aprTransferFrom.id));

  const aprGroceries2 = await createTx({
    accountId: checking.id,
    amount: '-112.30',
    date: '2026-04-25',
    payeeId: freshMart.id,
    notes: 'Weekly groceries',
    isCleared: true,
    tagIds: [food.id],
  });
  const aprWater = await createTx({
    accountId: checking.id,
    amount: '-65.00',
    date: '2026-04-28',
    payeeId: aquaWater.id,
    notes: 'April water bill',
    isCleared: true,
    tagIds: [utilities.id],
  });
  console.log('> Created 13 April transactions');

  const maySalary = await createTx({
    accountId: checking.id,
    amount: '5000.00',
    date: '2026-05-01',
    payeeId: acmeCorp.id,
    notes: 'Monthly salary',
    isCleared: true,
    tagIds: [income.id],
  });
  const mayRent = await createTx({
    accountId: checking.id,
    amount: '-1200.00',
    date: '2026-05-02',
    payeeId: sunriseApts.id,
    notes: 'Monthly rent',
    isCleared: true,
    tagIds: [housing.id],
  });
  const mayGroceries1 = await createTx({
    accountId: checking.id,
    amount: '-92.40',
    date: '2026-05-05',
    payeeId: freshMart.id,
    notes: 'Weekly groceries',
    isCleared: true,
    tagIds: [food.id],
  });
  const mayElectric = await createTx({
    accountId: checking.id,
    amount: '-88.00',
    date: '2026-05-07',
    payeeId: cityPower.id,
    notes: 'May electric bill',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const mayGym = await createTx({
    accountId: checking.id,
    amount: '-49.99',
    date: '2026-05-10',
    payeeId: primeFit.id,
    notes: 'Monthly membership',
    isCleared: true,
    tagIds: [health.id],
  });
  const mayInternet = await createTx({
    accountId: checking.id,
    amount: '-79.99',
    date: '2026-05-12',
    payeeId: netConnect.id,
    notes: 'Internet service',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const mayGas = await createTx({
    accountId: cashWallet.id,
    amount: '-52.00',
    date: '2026-05-14',
    payeeId: gasNGo.id,
    notes: 'Gas refill',
    isCleared: true,
    tagIds: [transport.id],
  });
  const mayDinner = await createTx({
    accountId: creditCard.id,
    amount: '-65.00',
    date: '2026-05-16',
    notes: 'Dinner out with friends',
    isCleared: true,
    tagIds: [food.id],
  });
  const mayStreaming = await createTx({
    accountId: creditCard.id,
    amount: '-15.99',
    date: '2026-05-19',
    payeeId: streamFlixPayee.id,
    notes: 'Monthly subscription (late)',
    isCleared: true,
    tagIds: [entertainment.id],
  });

  const mayTransferFrom = await createTx({
    accountId: checking.id,
    amount: '-500.00',
    date: '2026-05-20',
    notes: 'Transfer to savings',
    isCleared: true,
    tagIds: [income.id],
  });
  const mayTransferTo = await createTx({
    accountId: savings.id,
    amount: '500.00',
    date: '2026-05-20',
    notes: 'Transfer from checking',
    isCleared: true,
    tagIds: [income.id],
    transferId: mayTransferFrom.id,
  });
  await db
    .update(schema.transactions)
    .set({ transferId: mayTransferTo.id })
    .where(eq(schema.transactions.id, mayTransferFrom.id));

  const mayTech = await createTx({
    accountId: creditCard.id,
    amount: '-89.99',
    date: '2026-05-22',
    payeeId: techStore.id,
    notes: 'USB-C hub',
    isCleared: true,
    tagIds: [shopping.id],
  });
  const mayGroceries2 = await createTx({
    accountId: checking.id,
    amount: '-105.75',
    date: '2026-05-25',
    payeeId: freshMart.id,
    notes: 'Weekly groceries',
    isCleared: true,
    tagIds: [food.id],
  });
  const mayWater = await createTx({
    accountId: checking.id,
    amount: '-62.00',
    date: '2026-05-28',
    payeeId: aquaWater.id,
    notes: 'May water bill',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const mayGas2 = await createTx({
    accountId: cashWallet.id,
    amount: '-48.50',
    date: '2026-05-30',
    payeeId: gasNGo.id,
    notes: 'Gas refill',
    isCleared: true,
    tagIds: [transport.id],
  });
  console.log('> Created 15 May transactions');

  const junSalary = await createTx({
    accountId: checking.id,
    amount: '5200.00',
    date: '2026-06-01',
    payeeId: acmeCorp.id,
    notes: 'Monthly salary (incl. bonus)',
    isCleared: true,
    tagIds: [income.id],
  });
  const junRent = await createTx({
    accountId: checking.id,
    amount: '-1200.00',
    date: '2026-06-02',
    payeeId: sunriseApts.id,
    notes: 'Monthly rent',
    isCleared: true,
    tagIds: [housing.id],
  });
  const junGroceries1 = await createTx({
    accountId: checking.id,
    amount: '-78.20',
    date: '2026-06-04',
    payeeId: freshMart.id,
    notes: 'Weekly groceries',
    isCleared: true,
    tagIds: [food.id],
  });
  const junElectric = await createTx({
    accountId: checking.id,
    amount: '-92.00',
    date: '2026-06-06',
    payeeId: cityPower.id,
    notes: 'June electric bill',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const junGym = await createTx({
    accountId: checking.id,
    amount: '-49.99',
    date: '2026-06-08',
    payeeId: primeFit.id,
    notes: 'Monthly membership',
    isCleared: true,
    tagIds: [health.id],
  });
  const junInternet = await createTx({
    accountId: checking.id,
    amount: '-79.99',
    date: '2026-06-10',
    payeeId: netConnect.id,
    notes: 'Internet service',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const junGas = await createTx({
    accountId: cashWallet.id,
    amount: '-55.00',
    date: '2026-06-12',
    payeeId: gasNGo.id,
    notes: 'Gas refill',
    isCleared: true,
    tagIds: [transport.id],
  });
  const junDinner = await createTx({
    accountId: creditCard.id,
    amount: '-78.50',
    date: '2026-06-15',
    notes: 'Restaurant dinner',
    isCleared: true,
    tagIds: [food.id],
  });
  const junTech = await createTx({
    accountId: creditCard.id,
    amount: '-199.99',
    date: '2026-06-16',
    payeeId: techStore.id,
    notes: 'Wireless keyboard',
    isCleared: true,
    tagIds: [shopping.id],
  });
  const junStreaming = await createTx({
    accountId: creditCard.id,
    amount: '-15.99',
    date: '2026-06-18',
    payeeId: streamFlixPayee.id,
    notes: 'Monthly subscription',
    isCleared: true,
    tagIds: [entertainment.id],
  });

  const junTransferFrom = await createTx({
    accountId: checking.id,
    amount: '-500.00',
    date: '2026-06-18',
    notes: 'Transfer to savings',
    isCleared: true,
    tagIds: [income.id],
  });
  const junTransferTo = await createTx({
    accountId: savings.id,
    amount: '500.00',
    date: '2026-06-18',
    notes: 'Transfer from checking',
    isCleared: true,
    tagIds: [income.id],
    transferId: junTransferFrom.id,
  });
  await db
    .update(schema.transactions)
    .set({ transferId: junTransferTo.id })
    .where(eq(schema.transactions.id, junTransferFrom.id));

  const junGroceries2 = await createTx({
    accountId: checking.id,
    amount: '-95.60',
    date: '2026-06-20',
    payeeId: freshMart.id,
    notes: 'Weekly groceries',
    isCleared: true,
    tagIds: [food.id],
  });
  const junWater = await createTx({
    accountId: checking.id,
    amount: '-60.00',
    date: '2026-06-24',
    payeeId: aquaWater.id,
    notes: 'June water bill',
    isCleared: true,
    tagIds: [utilities.id],
  });
  const junGas2 = await createTx({
    accountId: cashWallet.id,
    amount: '-50.00',
    date: '2026-06-26',
    payeeId: gasNGo.id,
    notes: 'Gas refill',
    isCleared: true,
    tagIds: [transport.id],
  });
  console.log('> Created 15 June transactions');

  const [rentSchedule] = await db
    .insert(schema.paymentSchedules)
    .values({
      binderId: bId,
      name: 'Monthly Rent',
      accountId: checking.id,
      payeeId: sunriseApts.id,
      amount: '1200.00',
      repeatInterval: 1,
      repeatType: 'month',
      startDate: '2026-04-02',
      endType: 'never',
      weekendAdjustment: 'before',
      notifyBefore: 3,
      notifyType: 'days',
      isActive: true,
    })
    .returning();

  const [salarySchedule] = await db
    .insert(schema.paymentSchedules)
    .values({
      binderId: bId,
      name: 'Bi-Weekly Salary',
      accountId: checking.id,
      payeeId: acmeCorp.id,
      amount: '5000.00',
      repeatInterval: 1,
      repeatType: 'month',
      startDate: '2026-04-01',
      endType: 'never',
      weekendAdjustment: 'before',
      notifyBefore: 0,
      notifyType: 'days',
      isActive: true,
    })
    .returning();

  const [streamingSchedule] = await db
    .insert(schema.paymentSchedules)
    .values({
      binderId: bId,
      name: 'StreamFlix Subscription',
      accountId: creditCard.id,
      payeeId: streamFlixPayee.id,
      amount: '15.99',
      repeatInterval: 1,
      repeatType: 'month',
      startDate: '2026-04-18',
      endType: 'never',
      weekendAdjustment: 'none',
      notifyBefore: 7,
      notifyType: 'days',
      isActive: true,
    })
    .returning();
  console.log('> Created 3 payment schedules');

  await db.insert(schema.paymentScheduleOccurrences).values([
    { binderId: bId, scheduleId: rentSchedule.id, dueDate: '2026-04-02', transactionId: aprRent.id, paidAt: new Date('2026-04-02') },
    { binderId: bId, scheduleId: rentSchedule.id, dueDate: '2026-05-02', transactionId: mayRent.id, paidAt: new Date('2026-05-02') },
    { binderId: bId, scheduleId: rentSchedule.id, dueDate: '2026-06-02', transactionId: junRent.id, paidAt: new Date('2026-06-02') },
    { binderId: bId, scheduleId: rentSchedule.id, dueDate: '2026-07-02' },
    { binderId: bId, scheduleId: rentSchedule.id, dueDate: '2026-08-02' },
    { binderId: bId, scheduleId: salarySchedule.id, dueDate: '2026-04-01', transactionId: aprSalary.id, paidAt: new Date('2026-04-01') },
    { binderId: bId, scheduleId: salarySchedule.id, dueDate: '2026-05-01', transactionId: maySalary.id, paidAt: new Date('2026-05-01') },
    { binderId: bId, scheduleId: salarySchedule.id, dueDate: '2026-06-01', transactionId: junSalary.id, paidAt: new Date('2026-06-01') },
    { binderId: bId, scheduleId: salarySchedule.id, dueDate: '2026-07-01' },
    { binderId: bId, scheduleId: streamingSchedule.id, dueDate: '2026-04-18', transactionId: aprStreaming.id, paidAt: new Date('2026-04-18') },
    { binderId: bId, scheduleId: streamingSchedule.id, dueDate: '2026-05-18', transactionId: mayStreaming.id, paidAt: new Date('2026-05-19') },
    { binderId: bId, scheduleId: streamingSchedule.id, dueDate: '2026-06-18', transactionId: junStreaming.id, paidAt: new Date('2026-06-18') },
    { binderId: bId, scheduleId: streamingSchedule.id, dueDate: '2026-07-18' },
  ]);
  console.log('> Created 13 payment schedule occurrences');

  await db.insert(schema.investments).values({
    binderId: bId,
    accountId: investmentPortfolio.id,
    principalAmount: '10000.00',
    interestRate: '0.0550',
    interestPeriod: 'annually',
    compoundingFrequency: 'monthly',
    taxRate: '0.1500',
    startDate: '2026-01-01',
    maturityDate: '2031-01-01',
  });
  console.log('> Created 1 investment');

  console.log('\nSeeding complete!');
  await pool.end();
}

main().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
